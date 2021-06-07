import { Request, Response, NextFunction } from 'express'
import Joi from 'joi'
import config from 'config'
import { map, reduce } from 'lodash'
import { Op, Sequelize } from 'sequelize'
import { models, sequelize } from '../../../db/models'
import { IAppConfig } from '../../../types/interfaces'
import { MESSAGE_TYPE, ORDER_STATE } from '../../../utils/enums'
import ErrorBuilder from '../../../utils/ErrorBuilder'
import { TicketTypeModel } from '../../../db/models/ticketType'
import { validate, validBase64 } from '../../../utils/validation'
import { v4 as uuidv4 } from 'uuid';
import uploadFileFromBase64 from '../../../utils/uploader';
import { createPayment } from '../../../services/webpayService';
import { getDiscountCode } from '../../../services/discountCodeValidationService'
import { DiscountCodeModel } from '../../../db/models/discountCode'

const {
	Order,
	Ticket,
	TicketType,
	File
} = models

interface TicketTypesHashMap {
	[key: string]: TicketTypeModel
}

const appConfig: IAppConfig = config.get('app')

const uploadFolder = 'private/profile-photos'
const maxFileSize = 5 * 1024 * 1024 // 5MB
const validExtensions = ['png', 'jpg', 'jpeg']

export const schema = Joi.object({
	body: Joi.object().keys({
		tickets: Joi.array().length(1).required().items({
			email: Joi.string().email().max(255).required(),
			quantity: Joi.number().min(1).max(Number(appConfig.maxTicketPurchaseLimit)).required(),
			ticketTypeId: Joi.string().guid({ version: ['uuidv4'] }).required(),
			name: Joi.string().max(255),
			age: Joi.number().min(0).max(150),
			zip: Joi.string().max(10),
			photo: Joi.string().custom(validBase64(maxFileSize, validExtensions)),
			children: Joi.array().min(1).items({
				name: Joi.string().required().max(255),
				age: Joi.number().required(),
				photo: Joi.string().custom(validBase64(maxFileSize, validExtensions))
			})
		}),
		agreement: Joi.boolean().required().valid(true),
		discountCode: Joi.string().min(5).max(20),
		recaptcha: Joi.string().required()
	}),
	query: Joi.object(),
	params: Joi.object()
})

export const workflow = async (req: Request, res: Response, next: NextFunction) => {
	let transaction: any = null

	try {
		const { body } = req

		transaction = await sequelize.transaction()

		const order = await Order.create({
			price: 0,
			state: ORDER_STATE.CREATED
		}, { transaction })

		const ticketTypes: TicketTypesHashMap = reduce(
			await TicketType.findAll({
				where: {
					id: {
						[Op.in]: body.tickets.map((ticket: any) => ticket.ticketTypeId)
					}
				}
			}), (ticketTypesMap: TicketTypesHashMap, ticketType: TicketTypeModel) => {
				return { ...ticketTypesMap, [ticketType.id]: ticketType };
			}, {} as TicketTypesHashMap
		)

		let orderPrice = 0
		let discount = 0
		let discountCode
		for (const ticket of body.tickets) {
			const ticketType = ticketTypes[ticket.ticketTypeId]
			if (!ticketType) {
				throw new ErrorBuilder(404, req.t('error:ticketTypeNotFound'))
			}

			let applyDiscount = false
			if (body.discountCode && !discountCode) {
				discountCode = await getDiscountCode(body.discountCode, ticketType.id)

				if (!discountCode) {
					throw new ErrorBuilder(404, req.t('error:discountCodeNotValid'))
				}
				applyDiscount = true
			}

			// user cannot buy a ticket after its expiration
			validate(true, ticketType.validTo, Joi.date().min('now'),
				req.t('error:ticket.ticketHasExpired'), 'ticketHasExpired'
			)
			// name check
			validate(ticketType.nameRequired, ticket.name, Joi.required(), req.t('error:ticket.nameRequired'), 'nameRequired')
			// photo check
			validate(ticketType.photoRequired, ticket.photo, Joi.required(), req.t('error:ticket.photoRequired'), 'photoRequired')
			// seasonal ticket must have 1 quantity
			validate(ticketType.isSeasonal, ticket.quantity, Joi.number().equal(1),
				req.t('error:ticket.seasonTicketMustHaveOneQuantity'), 'seasonTicketMustHaveOneQuantity'
			)

			const numberOfChildren = ticket.children ? ticket.children.length : 0
			if (ticketType.childrenAllowed) {
				validate(true, numberOfChildren, Joi.number().max(ticketType.childrenMaxNumber),
					req.t('error:ticket.numberOfChildrenExceeded'), 'numberOfChildrenExceeded'
				)
				validate(true, ticket.children, Joi.array()
					.items({ age: Joi.number().min(ticketType.childrenAgeFrom).max(ticketType.childrenAgeTo), name: Joi.any(), photo: Joi.any() }),
					req.t('error:ticket.childrenHasInvalidAge'), 'childrenHasInvalidAge'
				)
				validate(true, ticket.children, Joi.array()
					.items({ photo: ticketType.childrenPhotoRequired ? Joi.required() : Joi.optional(), name: Joi.any(), age: Joi.any() }),
					req.t('error:ticket.childrenPhotoRequired'), 'childrenPhotoRequired'
				)

			} else {
				validate(true, ticket.children, Joi.forbidden(), req.t('error:ticket.childrenAreNotAllowed'), 'childrenAreNotAllowed')
			}

			let ticketsPrice = await saveTickets(ticket, ticketType, order.id, numberOfChildren, transaction)
			const totals = await getDiscount(ticketsPrice, applyDiscount, discount, discountCode, transaction)
			orderPrice += totals.ticketsPrice
			discount = totals.discount

		}

		await order.update({
			price: orderPrice,
			discount: discountCode ? discount : 0,
			discountCodeId: discountCode ? discountCode.id : undefined
		}, { transaction })
		await uploadProfilePhotos(req, body.tickets, transaction);

		const paymentData = await createPayment(order, transaction)

		await transaction.commit()
		transaction = null

		return res.json({
			data: {
				id: order.id,
				...paymentData
			},
			messages: [{
				type: MESSAGE_TYPE.SUCCESS,
				message: req.t('success:orderCreated')
			}]
		})
	} catch (err) {
		if (transaction) {
			await transaction.rollback()
		}
		return next(err)
	}
}

// for each instance add unique ticket
const saveTickets = async (ticket: any, ticketType: TicketTypeModel, orderId: string, numberOfChildren: number, transaction: any) => {
	let ticketsPrice = 0
	for (const _ of Array(ticket.quantity).keys()) {
		ticketsPrice += ticketType.price + ((ticketType.childrenPrice || 0) * numberOfChildren)
		await createTicket(ticket, ticketType, orderId, transaction);
	}
	return ticketsPrice
}

/**
 * Get price after discount if discount can be applied. Otherwise return the original price.
 */
const getDiscount = async (ticketsPrice: number, applyDiscount: boolean, discount: number, discountCode: DiscountCodeModel, transaction: any) => {
	if (applyDiscount) {
		discount = ticketsPrice - (Math.floor(ticketsPrice * discountCode.getInverseAmount * 100) / 100)
		ticketsPrice = (Math.floor(ticketsPrice * discountCode.getInverseAmount * 100) / 100)

		await discountCode.update({ usedAt: Sequelize.literal('CURRENT_TIMESTAMP') }, { transaction })
	}
	return { ticketsPrice, discount }
}

/**
 * Persist ticket with profile and his children. Also save profile IDs to the ticket object for later use when uploading profile photos.
*/
const createTicket = async (ticket: any, ticketType: TicketTypeModel, orderId: string, transaction: any) => {
	const profileId = uuidv4();
	(ticket.modelIds || (ticket.modelIds = [])).push(profileId);
	return await Ticket.create({
		isChildren: false,
		ticketTypeId: ticketType.id,
		orderId,
		price: ticketType.price,
		remainingEntries: ticketType.entriesNumber,
		profile: {
			id: profileId,
			email: ticket.email,
			name: ticket.name,
			age: ticket.age,
			zip: ticket.zip,
		},
		children: map(ticket.children, (children) => {
			const childrenProfileId = uuidv4();
			(children.modelIds || (children.modelIds = [])).push(childrenProfileId);
			return {
				isChildren: true,
				ticketTypeId: ticketType.id,
				remainingEntries: ticketType.entriesNumber,
				orderId,
				price: ticketType.childrenPrice,
				profile: {
					id: childrenProfileId,
					email: ticket.email,
					name: children.name,
					age: children.age,
				},
			}
		}),
	}, {
		transaction,
		include: [
			{
				association: 'profile',
			}, {
				association: 'children',
				include: [{
					association: 'profile'
				}]
			}]
	})
}


/**
 * Upload profile photo for every ticket and children
*/
const uploadProfilePhotos = async (req: Request, tickets: any, transaction: any) => {

	for (const ticket of tickets) {
		if (ticket.photo) {
			await uploadAndCreate(req, ticket.photo, ticket.modelIds, transaction);
		}

		for (const oneChildren of ticket.children || []) {
			if (oneChildren.photo) {
				await uploadAndCreate(req, oneChildren.photo, oneChildren.modelIds, transaction);
			}
		}
	}
}

/**
 * Create files from base64 and persist them for every CREATED ticket ( means if ticket has 5 quantity we are creating profile file for each )
*/
const uploadAndCreate = async (req: Request, photo: string, modelIds: Array<string>, transaction: any) => {
	for (const modelId of modelIds) {
		const file = await uploadFileFromBase64(req, photo, uploadFolder)

		await File.create({
			name: file.fileName,
			originalPath: file.filePath,
			mimeType: file.mimeType,
			size: file.size,
			relatedId: modelId,
			relatedType: 'profile'
		}, { transaction })
	}
}
