import { Request, Response, NextFunction } from 'express'
import Joi from 'joi'
import config from 'config'
import { Op, Sequelize } from 'sequelize'
import formUrlEncoded from 'form-urlencoded'
import { v4 as uuidv4 } from 'uuid'
import { models } from '../../../db/models'
import { IAppConfig, IPassportConfig } from '../../../types/interfaces'
import {
	AccountType,
	MESSAGE_TYPE,
	ORDER_PAYMENT_METHOD_STATES,
	ORDER_STATE,
} from '../../../utils/enums'
import ErrorBuilder from '../../../utils/ErrorBuilder'
import { TicketTypeModel } from '../../../db/models/ticketType'
import { validate } from '../../../utils/validation'
import uploadFileFromBase64 from '../../../utils/uploader'
import { createPayment } from '../../../services/webpayService'
import { getDiscountCode } from '../../../services/discountCodeValidationService'
import { DiscountCodeModel } from '../../../db/models/discountCode'
import { createJwt } from '../../../utils/authorization'
import { sendOrderEmail } from '../../../utils/emailSender'
import { getCognitoIdOfLoggedInUser } from '../../../utils/azureAuthentication'
import { getCityAccountData, isDefined } from '../../../utils/helpers'
import { logger } from '../../../utils/logger'
import { TicketModel } from '../../../db/models/ticket'
import { FE_ROUTES } from '../../../utils/constants'

const {
	SwimmingLoggedUser,
	AssociatedSwimmer,
	Order,
	Ticket,
	TicketType,
	File,
} = models

interface TicketTypesHashMap {
	[key: string]: TicketTypeModel
}

interface GetUser {
	associatedSwimmerId: string | null
	loggedUserId: string | null
	email: string
	name: string | null
	age: number | null
	zip: string | null
	cityAccountType?: AccountType
}

const appConfig: IAppConfig = config.get('app')
const passportConfig: IPassportConfig = config.get('passport')

const uploadFolder = 'private/profile-photos'
const maxFileSize = 5 * 1024 * 1024 // 5MB
const validExtensions = ['png', 'jpg', 'jpeg']

export const schema = Joi.object({
	body: Joi.object().keys({
		tickets: Joi.array()
			.required()
			.items({
				personId: Joi.string().allow(null),
				age: Joi.number().integer().min(0).max(150).allow(null),
				zip: Joi.string().min(0).max(10).allow(null, ''),
			}),
		email: Joi.string().email().max(255),
		ticketTypeId: Joi.string()
			.guid({ version: ['uuidv4'] })
			.required(),
		agreement: Joi.boolean().valid(true),
		discountCode: Joi.string().min(5).max(20),
		discountPercent: Joi.number(),
		token: Joi.string(),
		paymentMethod: Joi.string().valid(...ORDER_PAYMENT_METHOD_STATES),
	}),
	query: Joi.object(),
	params: Joi.object(),
})

export const workflowDryRun = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	try {
		const { body } = req

		await basicChecks(body.ticketTypeId, req)

		const pricing = await priceDryRun(req, body.ticketTypeId, true, '')
		return res.json({
			data: {
				pricing,
			},
			messages: [
				{
					type: MESSAGE_TYPE.SUCCESS,
					message: req.t('success:dryRun'),
				},
			],
		})
	} catch (err) {
		return next(err)
	}
}

export const workflow = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	try {
		const { body } = req

		await basicChecks(body.ticketTypeId, req)

		// check agreement
		if (body.agreement === undefined || body.agreement !== true) {
			throw new ErrorBuilder(400, req.t('error:ticket.agreementMissing'))
		}

		const order = await Order.create({
			price: 0,
			state: ORDER_STATE.CREATED,
			orderNumber: new Date().getTime(),
		})

		const pricing = await priceDryRun(
			req,
			body.ticketTypeId,
			false,
			order.id
		)
		const orderPrice = pricing.orderPrice
		const discount = pricing.discount
		const discountCode = pricing.discountCode

		await order.update({
			price: orderPrice,
			discount: discountCode ? discount : 0,
			discountCodeId: discountCode ? discountCode.id : undefined,
		})

		if (discountCode && discountCode.amount === 100) {
			await order.update({
				state: ORDER_STATE.PAID,
			})

			const orderAccessToken = await createJwt(
				{
					uid: order.id,
				},
				{
					audience: passportConfig.jwt.orderResponse.audience,
					expiresIn: passportConfig.jwt.orderResponse.exp,
				}
			)

			const orderResult = await Order.findOne({
				where: {
					orderNumber: {
						[Op.eq]: order.orderNumber,
					},
				},
				include: [
					{
						association: 'paymentOrder',
					},
					{
						association: 'tickets',
						order: [['isChildren', 'asc']],
						separate: true,
						include: [
							{
								association: 'profile',
							},
							{
								association: 'ticketType',
							},
						],
					},
				],
			})

			await sendOrderEmail(req, orderResult)

			return res.json({
				data: {
					id: order.id,
					url: FE_ROUTES.ORDER_SUCCESSFUL,
					formurlencoded: formUrlEncoded({
						success: true,
						orderId: order.id,
						orderAccessToken,
					}),
				},
				messages: [
					{
						type: MESSAGE_TYPE.SUCCESS,
						message: req.t('success:orderCreated'),
					},
				],
			})
		}

		const paymentData = await createPayment(order, body.paymentMethod)

		return res.json({
			data: {
				id: order.id,
				...paymentData,
			},
			messages: [
				{
					type: MESSAGE_TYPE.SUCCESS,
					message: req.t('success:orderCreated'),
				},
			],
		})
	} catch (err) {
		return next(err)
	}
}

// Compute price
const priceDryRun = async (
	req: Request,
	ticketTypeId: string,
	dryRun: boolean,
	orderId: string
) => {
	const { body } = req
	let orderPrice = 0
	let discount = 0
	let discountCode

	const loggedUserId = getCognitoIdOfLoggedInUser(req)

	const ticketType = await TicketType.findByPk(ticketTypeId)

	// check if ticket type exists
	if (!ticketType) {
		throw new ErrorBuilder(404, req.t('error:ticketTypeNotFound'))
	}

	// user cannot buy a ticket after its expiration
	validate(
		true,
		ticketType.validTo,
		Joi.date().min('now'),
		req.t('error:ticket.ticketHasExpired'),
		'ticketHasExpired'
	)

	// check if there is discount voucher, if yes, throw error
	if (body.discountCode && dryRun) {
		throw new ErrorBuilder(404, req.t('error:checkDiscoundCodeNotAllowed'))
	}

	// validate number of children
	let numberOfChildren = 0
	for (const ticket of body.tickets) {
		const user = await getUser(req, ticket, loggedUserId, dryRun)
		if (
			ticketType.childrenAllowed &&
			user.age &&
			user.age >= ticketType.childrenAgeFrom &&
			user.age <= ticketType.childrenAgeTo
		) {
			numberOfChildren += 1
		}
		if (
			ticketType.nameRequired &&
			user.cityAccountType &&
			user.cityAccountType !== AccountType.FO
		) {
			throw new ErrorBuilder(
				400,
				req.t('error:ticket.userNotAllowedTicketType')
			)
		}
	}

	// discount code check
	let applyDiscount = false
	if (body.discountCode && !dryRun) {
		discountCode = await getDiscountCode(body.discountCode, ticketType.id)
		if (!discountCode) {
			throw new ErrorBuilder(404, req.t('error:discountCodeNotValid'))
		}
		applyDiscount = true
	} else if (body.discountPercent > 0 && dryRun) {
		applyDiscount = true
	}

	// children allowed rules
	if (ticketType.childrenAllowed) {
		validate(
			true,
			numberOfChildren,
			Joi.number().max(ticketType.childrenMaxNumber),
			req.t('error:ticket.numberOfChildrenExceeded'),
			'numberOfChildrenExceeded'
		)
		const numberOfAdults = body.tickets.length - numberOfChildren
		// minimum is one adult
		if (numberOfAdults < 1) {
			throw new ErrorBuilder(400, req.t('error:ticket.minimumIsOneAdult'))
		}
		// if discount in seasonpass, only for one user
		if (numberOfAdults > 1 && applyDiscount) {
			throw new ErrorBuilder(
				400,
				req.t('error:ticket.discountOnlyForOneUser')
			)
		}
	}

	//price computation
	for (const ticket of body.tickets) {
		const user = await getUser(req, ticket, loggedUserId, dryRun)
		let isChildren = false
		if (
			user.age &&
			user.age >= ticketType.childrenAgeFrom &&
			user.age <= ticketType.childrenAgeTo
		) {
			isChildren = true
		}

		const ticketsPrice = await saveTickets(
			user,
			ticketType,
			orderId,
			dryRun,
			isChildren,
			ticketType.photoRequired
		)

		let totals = { newTicketsPrice: ticketsPrice, discount: discount }

		if (!dryRun) {
			if (applyDiscount) {
				totals = getDiscount(
					ticketsPrice,
					discountCode.getInverseAmount * 100
				)
				await discountCode.update({
					usedAt: Sequelize.literal('CURRENT_TIMESTAMP'),
				})
			}
		} else {
			totals = getDiscount(ticketsPrice, 100 - (body.discountPercent | 0))
		}
		orderPrice += totals.newTicketsPrice
		discount = totals.discount
	}
	return {
		orderPrice: Math.floor(orderPrice * 100) / 100,
		discount: Math.floor(discount * 100) / 100,
		discountCode: discountCode,
		numberOfChildren: numberOfChildren,
	}
}

// for each instance add unique ticket
const saveTickets = async (
	user: GetUser,
	ticketType: TicketTypeModel,
	orderId: string,
	dryRun: boolean,
	isChildren: boolean,
	photoRequired: boolean
) => {
	let ticketsPrice = ticketType.price
	if (
		isChildren &&
		ticketType.childrenPrice &&
		ticketType.childrenPrice != null
	) {
		ticketsPrice = ticketType.childrenPrice
	}
	// for (const _ of Array(ticket.quantity).keys()) {
	// 	ticketsPrice +=
	// 		ticketType.price +
	// 		(ticketType.childrenPrice || 0) * numberOfChildren;
	if (!dryRun) {
		const createdTicket = await createTicketWithProfile(
			user,
			ticketType,
			orderId,
			isChildren,
			ticketsPrice,
			null
		)
		if (photoRequired) {
			await uploadProfilePhotos(createdTicket)
		}
	}

	return ticketsPrice
}

/**
 * Get user data from asociate swimmers or users
 */
const getUser = async (
	req: Request,
	ticket: any,
	loggedUserId: string | null,
	dryRun: boolean
): Promise<GetUser> => {
	const { body } = req
	if (ticket.personId === undefined) {
		if (dryRun) {
			return {
				associatedSwimmerId: null,
				loggedUserId: null,
				email: body.email,
				name: '',
				age: ticket.age,
				zip: ticket.zip,
			}
		} else if (body.email) {
			return {
				associatedSwimmerId: null,
				loggedUserId: null,
				email: body.email,
				name: null,
				age: ticket.age,
				zip: ticket.zip,
			}
		} else {
			throw new ErrorBuilder(404, req.t('error:emailIsEmpty'))
		}
	} else if (ticket.personId === null) {
		if (!loggedUserId)
			throw new ErrorBuilder(
				401,
				req.t('error:ticket.notLoggedUserForTicket')
			)
		const swimmingLoggedUser = await SwimmingLoggedUser.findOne({
			where: { externalCognitoId: loggedUserId },
		})
		if (!swimmingLoggedUser)
			throw new ErrorBuilder(401, req.t('error:ticket.userNotFound'))

		const cityAccountData = await getCityAccountData(
			req.headers.authorization
		)
		if (!cityAccountData)
			throw new ErrorBuilder(401, req.t('error:ticket.userNotFound'))
		if (!cityAccountData.email)
			throw new ErrorBuilder(
				500,
				req.t('error:ticket.emailNotFoundOnUser')
			)

		return {
			associatedSwimmerId: null,
			loggedUserId: swimmingLoggedUser.id,
			email: cityAccountData.email,
			name: [cityAccountData.given_name, cityAccountData.family_name]
				.filter(isDefined)
				.join(' '),
			age: swimmingLoggedUser.age,
			zip: swimmingLoggedUser.zip,
			cityAccountType: cityAccountData['custom:account_type'],
		}
	} else {
		if (!loggedUserId)
			throw new ErrorBuilder(
				401,
				req.t('error:ticket.notLoggedUserForTicket')
			)
		const swimmingLoggedUser = await SwimmingLoggedUser.findOne({
			where: { externalCognitoId: loggedUserId },
		})
		if (!swimmingLoggedUser)
			throw new ErrorBuilder(401, req.t('error:ticket.userNotFound'))
		const cityAccountData = await getCityAccountData(
			req.headers.authorization
		)
		if (!cityAccountData)
			throw new ErrorBuilder(401, req.t('error:ticket.userNotFound'))
		if (!cityAccountData.email)
			throw new ErrorBuilder(
				500,
				req.t('error:ticket.emailNotFoundOnUser')
			)

		const user = await AssociatedSwimmer.findByPk(ticket.personId)
		if (!user) {
			throw new ErrorBuilder(
				404,
				req.t('error:associatedSwimmerNotExists')
			)
		} else {
			return {
				associatedSwimmerId: user.id,
				loggedUserId: swimmingLoggedUser.id,
				email: cityAccountData.email,
				name: user.firstname + ' ' + user.lastname,
				age: user.age,
				zip: user.zip,
			}
		}
	}
}
/**
 * Get price after discount.
 */
const getDiscount = (
	ticketsPrice: number,
	discountCodeInverseAmount: number
) => {
	const priceWithDiscount =
		Math.floor(ticketsPrice * discountCodeInverseAmount) / 100
	return {
		newTicketsPrice: priceWithDiscount,
		discount: ticketsPrice - priceWithDiscount,
	}
}

/**
 * Persist ticket with profile and his children. Also save profile IDs to the ticket object for later use when uploading profile photos.
 */
const createTicketWithProfile = async (
	user: GetUser,
	ticketType: TicketTypeModel,
	orderId: string,
	isChildren: boolean,
	ticketPrice: number,
	parentTicketId: null | string
) => {
	const profileId = uuidv4()
	// this was used in the now commented out uploadProfilePhotos - since that one was kept in code keeping this as well
	// ;(ticket.modelIds || (ticket.modelIds = [])).push(profileId)
	return await Ticket.create(
		{
			isChildren: isChildren,
			ticketTypeId: ticketType.id,
			orderId,
			price: ticketPrice,
			parentTicketId: parentTicketId,
			remainingEntries: ticketType.entriesNumber,
			swimmingLoggedUserId: user.loggedUserId,
			associatedSwimmerId: user.associatedSwimmerId,
			profile: {
				id: profileId,
				email: user.email,
				name: ticketType.nameRequired ? user.name : null,
				age: ticketType.nameRequired ? user.age : null,
				zip: user.zip,
			},
		},
		{
			include: [
				{
					association: 'profile',
				},
			],
		}
	)
}

/**
 * Upload profile photo for every ticket and children
 */

const uploadProfilePhotos = async (ticket: TicketModel) => {
	let relatedId = null
	if (ticket.associatedSwimmerId) {
		relatedId = ticket.associatedSwimmerId
	} else if (ticket.swimmingLoggedUserId) {
		relatedId = ticket.swimmingLoggedUserId
	}
	const file = await File.findOne({ where: { relatedId: relatedId } })
	if (file) {
		await File.create({
			name: file.name,
			originalPath: file.originalPath,
			thumbnailSizePath: file.thumbnailSizePath,
			smallSizePath: file.smallSizePath,
			mediumSizePath: file.mediumSizePath,
			largeSizePath: file.largeSizePath,
			altText: file.altText,
			mimeType: file.mimeType,
			size: file.size,
			relatedId: ticket.profileId,
			relatedType: 'profile',
		})
	}
}

const basicChecks = async (ticketTypeId: string, req: Request) => {
	const loggedUserId = getCognitoIdOfLoggedInUser(req)

	const ticketType = await TicketType.findByPk(ticketTypeId)

	if (!ticketType) {
		throw new ErrorBuilder(404, req.t('error:ticket.notFoundTicketType'))
	}

	// check ticket type and logged user
	if (ticketType.nameRequired && !loggedUserId) {
		throw new ErrorBuilder(
			400,
			req.t('error:ticket.notLoggedUserForTicket')
		)
	}

	// check maximum tickets
	if (req.body.tickets.length > appConfig.maxTicketPurchaseLimit) {
		throw new ErrorBuilder(400, req.t('error:ticket.maxtTicketsPerOrder'))
	}
}

// const uploadProfilePhotos = async (
// 	req: Request,
// 	tickets: any,
// ) => {
// 	for (const ticket of tickets) {
// 		if (ticket.photo) {
// 			await uploadAndCreate(
// 				req,
// 				ticket.photo,
// 				ticket.modelIds
// 			);
// 		}

// 		for (const oneChildren of ticket.children || []) {
// 			if (oneChildren.photo) {
// 				await uploadAndCreate(
// 					req,
// 					oneChildren.photo,
// 					oneChildren.modelIds,
// 				);
// 			}
// 		}
// 	}
// };

/**
 * Create files from base64 and persist them for every CREATED ticket ( means if ticket has 5 quantity we are creating profile file for each )
 */
const uploadAndCreate = async (
	req: Request,
	photo: string,
	modelIds: Array<string>
) => {
	for (const modelId of modelIds) {
		const file = await uploadFileFromBase64(req, photo, uploadFolder)

		await File.create({
			name: file.fileName,
			originalPath: file.filePath,
			mimeType: file.mimeType,
			size: file.size,
			relatedId: modelId,
			relatedType: 'profile',
		})
	}
}
