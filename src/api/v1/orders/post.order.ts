import type {
	ParamsDictionary,
	Request as CoreRequest,
} from 'express-serve-static-core'
import { Response, NextFunction } from 'express'
import Joi from 'joi'
import { z } from 'zod'
import config from 'config'
import { Op, Sequelize } from 'sequelize'
import formUrlEncoded from 'form-urlencoded'
import { v4 as uuidv4 } from 'uuid'
import { models } from '../../../db/models'
import { IAppConfig, IPassportConfig } from '../../../types/interfaces'
import {
	AccountType,
	MESSAGE_TYPE,
	ORDER_PAYMENT_METHOD_STATE,
	ORDER_STATE,
} from '../../../utils/enums'
import ErrorBuilder from '../../../utils/ErrorBuilder'
import { TicketTypeModel } from '../../../db/models/ticketType'
import { validate } from '../../../utils/validation'
import { createPayment } from '../../../services/webpayService'
import { getDiscountCode } from '../../../services/discountCodeValidationService'
import { createJwt } from '../../../utils/authorization'
import { sendOrderEmail } from '../../../utils/emailSender'
import { getCognitoIdOfLoggedInUser } from '../../../utils/azureAuthentication'
import {
	getDiscount,
	getCityAccountData,
	payOrderWithNextOrderNumber,
	isDefined,
} from '../../../utils/helpers'
import { TicketModel } from '../../../db/models/ticket'
import { FE_ROUTES } from '../../../utils/constants'
import { CityAccountUser } from '../../../utils/cityAccountDto'
import i18next from 'i18next'
import { DiscountCodeModel } from '../../../db/models/discountCode'

const {
	SwimmingLoggedUser,
	AssociatedSwimmer,
	Order,
	Ticket,
	TicketType,
	File,
} = models

interface User {
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

const postOrderTicketSchema = z.object({
	personId: z.uuid().nullable().optional(),
	age: z.number().int().min(0).max(150).nullable().optional(),
	zip: z.string().max(10).nullable().optional(),
	ticketTypeId: z.uuid(),
})

export const postOrderDryRunBodySchema = z.object({
	tickets: z.array(postOrderTicketSchema).min(1, {
		message: i18next.t('error:ticket.minimumOneTicket'),
	}),
	email: z.email().max(255).optional(),
	discountCode: z.string().min(5).max(20).optional(),
	discountPercent: z.number().optional(),
})

export const postOrderBodySchema = postOrderDryRunBodySchema.extend({
	agreement: z.boolean({
		message: i18next.t('error:ticket.agreementMissing'),
	}),
	paymentMethod: z.enum(ORDER_PAYMENT_METHOD_STATE),
})

export type PostOrderTicket = z.infer<typeof postOrderTicketSchema>
export type PostOrderBody = z.infer<typeof postOrderBodySchema>
export type PostOrderDryRunBody = z.infer<typeof postOrderDryRunBodySchema>

export const postOrderSchema = z.object({
	body: postOrderBodySchema,
	query: z.unknown(),
	params: z.unknown(),
})

export const postOrderDryRunSchema = z.object({
	body: postOrderDryRunBodySchema,
	query: z.unknown(),
	params: z.unknown(),
})

export type PostOrderRequest = z.infer<typeof postOrderSchema>
export type PostOrderDryRunRequest = z.infer<typeof postOrderDryRunSchema>

/** Body-typed request; use `CoreRequest` because `Request` from `express` is not generic. */
export type RequestPostOrderDryRun = CoreRequest<
	ParamsDictionary,
	unknown,
	PostOrderDryRunBody
>
export type RequestPostOrder = CoreRequest<
	ParamsDictionary,
	unknown,
	PostOrderBody
>

type TicketWithTicketType = PostOrderTicket & {
	ticketType: TicketTypeModel
}

export const workflowDryRun = async (
	req: RequestPostOrderDryRun,
	res: Response,
	next: NextFunction
) => {
	try {
		const { body } = req

		const ticketsWithTicketType = await mapTicketTypeToTickets(body.tickets)

		await basicChecks(
			req,
			ticketsWithTicketType,
			100 - (body.discountPercent | 0)
		)

		// check if there is discount voucher, if yes, throw error
		// in dry run we don't want to check the discount code, we check for body.discountPercent
		// TODO refactor FE and this to use discount code in dry run as well
		if (body.discountCode) {
			throw new ErrorBuilder(
				404,
				req.t('error:checkDiscoundCodeNotAllowed')
			)
		}

		const pricing = await getOrderPrice(
			req,
			ticketsWithTicketType,
			100 - (body.discountPercent | 0)
		)
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
	req: RequestPostOrder,
	res: Response,
	next: NextFunction
) => {
	try {
		const { body } = req

		// TODO discount code!!!!!
		let discountCode: DiscountCodeModel | undefined = undefined
		// let discountCode = body.discountCode
		// 	? await getDiscountCode(body.discountCode, ticketType.id)
		// 	: undefined
		if (body.discountCode && !discountCode) {
			throw new ErrorBuilder(404, req.t('error:discountCodeNotValid'))
		}

		const ticketsWithTicketType = await mapTicketTypeToTickets(body.tickets)

		await basicChecks(
			req,
			ticketsWithTicketType,
			discountCode ? discountCode.getInverseAmount * 100 : undefined
		)

		// TODO agreement should be checked in schema validation
		// check agreement
		if (body.agreement === undefined || body.agreement !== true) {
			throw new ErrorBuilder(400, req.t('error:ticket.agreementMissing'))
		}

		const loggedUserId = getCognitoIdOfLoggedInUser(req)

		const order = await Order.create({
			priceWithVat: 0,
			state: ORDER_STATE.CREATED,
			orderNumber: new Date().getTime(),
		})
		const cityAccountData = req.headers.authorization
			? await getCityAccountData(req.headers.authorization)
			: null

		// for each instance add unique ticket
		for (const ticketWithTicketType of ticketsWithTicketType) {
			const user = await getUser(
				req,
				ticketWithTicketType,
				loggedUserId,
				cityAccountData
			)
			if (ticketWithTicketType.personId === undefined) {
				if (!body.email) {
					throw new ErrorBuilder(404, req.t('error:emailIsEmpty'))
				}
			}

			let ticketPrice = await getTicketPrice(
				req,
				ticketWithTicketType,
				loggedUserId,
				cityAccountData
			)

			let isChildren = getIsChildrenForTicketType(
				user,
				ticketWithTicketType.ticketType
			)

			// TODO creating ticket should happen after transaction is paid
			const createdTicket = await createTicketWithProfile(
				user,
				ticketWithTicketType.ticketType,
				order.id,
				isChildren,
				ticketPrice,
				ticketWithTicketType.ticketType.vatPercentage,
				null
			)
			if (ticketWithTicketType.ticketType.photoRequired) {
				await uploadProfilePhotos(createdTicket)
			}
		}

		const pricing = await getOrderPrice(
			req,
			ticketsWithTicketType,
			// TODO discount code!!!!!
			discountCode ? discountCode.getInverseAmount * 100 : undefined
		)
		// TODO discount code!!!!!
		if (discountCode) {
			await discountCode.update({
				usedAt: Sequelize.literal('CURRENT_TIMESTAMP'),
			})
		}
		const orderPriceWithVat = pricing.orderPriceWithVat
		const discount = pricing.discount

		await order.update({
			priceWithVat: orderPriceWithVat,
			discount: discountCode ? discount : 0,
			// TODO discount code!!!!!
			discountCodeId: discountCode ? discountCode.id : undefined,
		})

		// TODO discount code!!!!!
		if (discountCode && discountCode.amount === 100) {
			// refactor this - extract to separate function that can be used both here and in get.post.paymentResponse.ts
			await payOrderWithNextOrderNumber(order)
			const orderAccessToken = await createJwt(
				{
					uid: order.id,
				},
				{
					audience: passportConfig.jwt.orderResponse.audience,
					expiresIn: passportConfig.jwt.orderResponse.exp,
				}
			)

			// we already have order, so we don't need to fetch it again
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

			await sendOrderEmail(req, orderResult.id)

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
// TODO refactor to not use req parameter
const getOrderPrice = async (
	req: RequestPostOrder | RequestPostOrderDryRun,
	ticketsWithTicketType: TicketWithTicketType[],
	reverseDiscountInPercent: number | undefined
) => {
	let orderPrice = 0
	let discount = 0

	const loggedUserId = getCognitoIdOfLoggedInUser(req)
	const cityAccountData = req.headers.authorization
		? await getCityAccountData(req.headers.authorization)
		: null

	//price computation
	for (const ticketWithTicketType of ticketsWithTicketType) {
		const ticketPrice = await getTicketPrice(
			req,
			ticketWithTicketType,
			loggedUserId,
			cityAccountData
		)

		let totals = { newTicketsPrice: ticketPrice, discount: discount }
		if (
			reverseDiscountInPercent !== undefined &&
			reverseDiscountInPercent !== null
		) {
			totals = getDiscount(ticketPrice, reverseDiscountInPercent)
		}
		orderPrice += totals.newTicketsPrice
		discount += totals.discount
	}
	return {
		orderPriceWithVat: Math.round(orderPrice * 100) / 100,
		discount: Math.round(discount * 100) / 100,
	}
}

// TODO refactor to not use req parameter
const getTicketPrice = async (
	req: RequestPostOrder | RequestPostOrderDryRun,
	ticket: PostOrderTicket,
	loggedUserId: string | null,
	cityAccountData: Partial<CityAccountUser> | null
) => {
	const user = await getUser(req, ticket, loggedUserId, cityAccountData)

	const ticketType = await TicketType.findByPk(ticket.ticketTypeId)
	// !!!!!!!
	// TODO ticketType can be null but function findByPk doesn't look like it is returning it, test if `findByPk` returns null and check code behavior
	let isChildren = getIsChildrenForTicketType(user, ticketType)
	let ticketPriceWithVat = ticketType.priceWithVat

	if (
		isChildren &&
		ticketType.childrenPriceWithVat &&
		ticketType.childrenPriceWithVat != null
	) {
		ticketPriceWithVat = ticketType.childrenPriceWithVat
	}

	return ticketPriceWithVat
}

// TODO refactor to not use req parameter
/**
 * Get user data from asociate swimmers or users
 */
const getUser = async (
	req: RequestPostOrder | RequestPostOrderDryRun,
	ticket: any,
	loggedUserId: string | null,
	cityAccountData: Partial<CityAccountUser> | null
): Promise<User> => {
	const { body } = req
	if (ticket.personId === undefined) {
		if (body.email) {
			return {
				associatedSwimmerId: null,
				loggedUserId: null,
				email: body.email,
				name: null,
				age: ticket.age,
				zip: ticket.zip,
			}
		} else {
			return {
				associatedSwimmerId: null,
				loggedUserId: null,
				email: body.email,
				name: '',
				age: ticket.age,
				zip: ticket.zip,
			}
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

const getIsChildrenForTicketType = (
	user: User,
	ticketType: TicketTypeModel
) => {
	let isChildren = false
	if (
		ticketType.childrenAllowed &&
		user.age &&
		user.age >= ticketType.childrenAgeFrom &&
		user.age <= ticketType.childrenAgeTo
	) {
		isChildren = true
	}
	return isChildren
}

/**
 * Persist ticket with profile and his children. Also save profile IDs to the ticket object for later use when uploading profile photos.
 */
const createTicketWithProfile = async (
	user: User,
	ticketType: TicketTypeModel,
	orderId: string,
	isChildren: boolean,
	ticketPriceWithVat: number,
	vatPercentage: number,
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
			priceWithVat: ticketPriceWithVat,
			vatPercentage: vatPercentage,
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

// TODO refactor to not use req parameter
const basicChecks = async (
	req: RequestPostOrder | RequestPostOrderDryRun,
	ticketsWithTicketType: TicketWithTicketType[],
	reverseDiscountInPercent: number
) => {
	const loggedUserId = getCognitoIdOfLoggedInUser(req)

	ticketsWithTicketType.forEach((ticketWithTicketType) => {
		if (!ticketWithTicketType.ticketType) {
			throw new ErrorBuilder(404, req.t('error:ticketTypeNotFound'))
		}
		if (ticketWithTicketType.ticketType.nameRequired && !loggedUserId) {
			throw new ErrorBuilder(
				400,
				req.t('error:ticket.notLoggedUserForTicket')
			)
		}
		validate(
			true,
			ticketWithTicketType.ticketType.validTo,
			Joi.date().min(new Date()),
			req.t('error:ticket.ticketHasExpired'),
			'ticketHasExpired'
		)
	})

	// check maximum tickets
	if (ticketsWithTicketType.length > appConfig.maxTicketPurchaseLimit) {
		throw new ErrorBuilder(400, req.t('error:ticket.maxtTicketsPerOrder'))
	}

	const cityAccountData = req.headers.authorization
		? await getCityAccountData(req.headers.authorization)
		: null

	// validate number of children
	let numberOfChildren = 0
	for (const ticketWithTicketType of ticketsWithTicketType) {
		const user = await getUser(
			req,
			ticketWithTicketType,
			loggedUserId,
			cityAccountData
		)
		if (getIsChildrenForTicketType(user, ticketWithTicketType.ticketType)) {
			numberOfChildren += 1
		}
		if (
			ticketWithTicketType.ticketType.nameRequired &&
			user.cityAccountType &&
			user.cityAccountType !== AccountType.FO
		) {
			throw new ErrorBuilder(
				400,
				req.t('error:ticket.userNotAllowedTicketType')
			)
		}
		// children allowed rules
		if (ticketWithTicketType.ticketType.childrenAllowed) {
			validate(
				true,
				numberOfChildren,
				Joi.number().max(
					ticketWithTicketType.ticketType.childrenMaxNumber
				),
				req.t('error:ticket.numberOfChildrenExceeded'),
				'numberOfChildrenExceeded'
			)
		}
		const numberOfAdults = ticketsWithTicketType.length - numberOfChildren
		// minimum is one adult
		if (numberOfAdults < 1) {
			throw new ErrorBuilder(400, req.t('error:ticket.minimumIsOneAdult'))
		}
		// if discount in seasonpass, only for one user
		if (
			numberOfAdults > 1 &&
			reverseDiscountInPercent &&
			reverseDiscountInPercent !== 100
		) {
			throw new ErrorBuilder(
				400,
				req.t('error:ticket.discountOnlyForOneUser')
			)
		}
	}
}
const mapTicketTypeToTickets = async (tickets: PostOrderTicket[]) => {
	const ticketTypeIds = Array.from(
		new Set(tickets.map((ticket) => ticket.ticketTypeId))
	)

	const ticketTypes = await TicketType.findAll({
		where: {
			id: {
				[Op.in]: ticketTypeIds,
			},
		},
	})

	const ticketsWithTicketType = tickets.map((ticket) => {
		return {
			...ticket,
			ticketType: ticketTypes.find(
				(ticketType) => ticketType.id === ticket.ticketTypeId
			),
		}
	})
	return ticketsWithTicketType
}
