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

type TicketWithAdditionalProperties = PostOrderTicket & {
	ticketType: TicketTypeModel
	isChildren: boolean
	user: User
}

export const workflowDryRun = async (
	req: RequestPostOrderDryRun,
	res: Response,
	next: NextFunction
) => {
	try {
		const { body } = req

		const reverseDiscountInPercent = 100 - (body.discountPercent | 0)

		const cognitoId = getCognitoIdOfLoggedInUser(req)

		// why is this not throwing error when in 'getTicketsAndPricing' email is required and we are sending possible undefined email?
		const { pricing } = await getTicketsAndPricing(
			cognitoId,
			body.tickets,
			reverseDiscountInPercent,
			body.email,
			req.headers.authorization
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
			throw new ErrorBuilder(404, i18next.t('error:discountCodeNotValid'))
		}

		const reverseDiscountInPercent = discountCode
			? discountCode.getInverseAmount * 100
			: undefined

		const cognitoId = getCognitoIdOfLoggedInUser(req)

		// why is this not throwing error when in 'getTicketsAndPricing' email is required and we are sending possible undefined email?
		const { mappedTickets, pricing } = await getTicketsAndPricing(
			cognitoId,
			body.tickets,
			reverseDiscountInPercent,
			body.email,
			req.headers.authorization
		)

		const order = await createAndProcessOrder(
			mappedTickets,
			discountCode,
			pricing
		)

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

			await sendOrderEmail(req, order.id)

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
const getOrderPrice = async (
	ticketsWithAdditionalProperties: TicketWithAdditionalProperties[],
	reverseDiscountInPercent?: number
) => {
	let orderPrice = 0
	let discount = 0

	//price computation
	for (const ticketWithAdditionalProperties of ticketsWithAdditionalProperties) {
		const ticketPrice = await getTicketPrice(
			ticketWithAdditionalProperties.isChildren,
			ticketWithAdditionalProperties.ticketType
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

const getTicketPrice = async (
	isChildren: boolean,
	ticketType: TicketTypeModel
) => {
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

/**
 * Get user data from asociate swimmers or users
 */
const getUser = async (
	ticket: PostOrderTicket,
	cognitoId: string | null,
	cityAccountData: Partial<CityAccountUser> | null,
	email?: string
): Promise<User> => {
	if (ticket.personId === undefined) {
		if (email) {
			return {
				associatedSwimmerId: null,
				loggedUserId: null,
				email: email,
				name: null,
				age: ticket.age,
				zip: ticket.zip,
			}
		} else {
			return {
				associatedSwimmerId: null,
				loggedUserId: null,
				email: email,
				name: '',
				age: ticket.age,
				zip: ticket.zip,
			}
		}
	} else if (ticket.personId === null) {
		if (!cognitoId)
			throw new ErrorBuilder(
				401,
				i18next.t('error:ticket.notLoggedUserForTicket')
			)
		const swimmingLoggedUser = await SwimmingLoggedUser.findOne({
			where: { externalCognitoId: cognitoId },
		})
		if (!swimmingLoggedUser)
			throw new ErrorBuilder(401, i18next.t('error:ticket.userNotFound'))

		if (!cityAccountData)
			throw new ErrorBuilder(401, i18next.t('error:ticket.userNotFound'))
		if (!cityAccountData.email)
			throw new ErrorBuilder(
				500,
				i18next.t('error:ticket.emailNotFoundOnUser')
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
		if (!cognitoId)
			throw new ErrorBuilder(
				401,
				i18next.t('error:ticket.notLoggedUserForTicket')
			)
		const swimmingLoggedUser = await SwimmingLoggedUser.findOne({
			where: { externalCognitoId: cognitoId },
		})
		if (!swimmingLoggedUser)
			throw new ErrorBuilder(401, i18next.t('error:ticket.userNotFound'))
		if (!cityAccountData)
			throw new ErrorBuilder(401, i18next.t('error:ticket.userNotFound'))
		if (!cityAccountData.email)
			throw new ErrorBuilder(
				500,
				i18next.t('error:ticket.emailNotFoundOnUser')
			)

		const user = await AssociatedSwimmer.findByPk(ticket.personId)
		if (!user) {
			throw new ErrorBuilder(
				404,
				i18next.t('error:associatedSwimmerNotExists')
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
	vatPercentage: number
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
	cognitoId: string,
	ticketsWithTicketType: TicketWithAdditionalProperties[],
	reverseDiscountInPercent: number,
	email: string
) => {
	const numberOfChildren = ticketsWithTicketType.filter(
		(ticketWithTicketType) => ticketWithTicketType.isChildren
	).length

	const numberOfAdults = ticketsWithTicketType.length - numberOfChildren
	// minimum is one adult
	if (numberOfAdults < 1) {
		throw new ErrorBuilder(400, i18next.t('error:ticket.minimumIsOneAdult'))
	}
	// if discount in seasonpass, only for one user
	if (
		numberOfAdults > 1 &&
		reverseDiscountInPercent &&
		reverseDiscountInPercent !== 100
	) {
		throw new ErrorBuilder(
			400,
			i18next.t('error:ticket.discountOnlyForOneUser')
		)
	}

	// check maximum tickets
	if (ticketsWithTicketType.length > appConfig.maxTicketPurchaseLimit) {
		throw new ErrorBuilder(
			400,
			i18next.t('error:ticket.maxtTicketsPerOrder')
		)
	}

	ticketsWithTicketType.forEach((ticketWithTicketType) => {
		if (!ticketWithTicketType.ticketType) {
			throw new ErrorBuilder(404, i18next.t('error:ticketTypeNotFound'))
		}
		if (ticketWithTicketType.ticketType.nameRequired && !cognitoId) {
			throw new ErrorBuilder(
				400,
				i18next.t('error:ticket.notLoggedUserForTicket')
			)
		}
		validate(
			true,
			ticketWithTicketType.ticketType.validTo,
			Joi.date().min(new Date()),
			i18next.t('error:ticket.ticketHasExpired'),
			'ticketHasExpired'
		)
		if (
			ticketWithTicketType.ticketType.nameRequired &&
			ticketWithTicketType.user.cityAccountType &&
			ticketWithTicketType.user.cityAccountType !== AccountType.FO
		) {
			throw new ErrorBuilder(
				400,
				i18next.t('error:ticket.userNotAllowedTicketType')
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
				i18next.t('error:ticket.numberOfChildrenExceeded'),
				'numberOfChildrenExceeded'
			)
		}
		if (ticketWithTicketType.personId === undefined) {
			if (!email) {
				throw new ErrorBuilder(404, i18next.t('error:emailIsEmpty'))
			}
		}
	})
}
const mapPropertiesToTickets = async (
	tickets: PostOrderTicket[],
	cognitoId: string | null,
	cityAccountData: Partial<CityAccountUser> | null,
	email: string
) => {
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

	const ticketsWithTicketType = await Promise.all(
		tickets.map(async (ticket) => {
			const ticketType = ticketTypes.find(
				(ticketType) => ticketType.id === ticket.ticketTypeId
			)

			const ticketWithTicketType = {
				...ticket,
				ticketType: ticketType,
			}
			const user = await getUser(
				ticketWithTicketType,
				cognitoId,
				cityAccountData,
				email
			)
			const isChildren = getIsChildrenForTicketType(user, ticketType)

			return {
				...ticket,
				ticketType: ticketTypes.find(
					(ticketType) => ticketType.id === ticket.ticketTypeId
				),
				isChildren: isChildren,
				user: user,
			}
		})
	)
	return ticketsWithTicketType
}
const getTicketsAndPricing = async (
	cognitoId: string | null,
	tickets: PostOrderTicket[],
	reverseDiscountInPercent: number,
	email: string,
	authorization?: string
) => {
	const cityAccountData = authorization
		? await getCityAccountData(authorization)
		: null

	const mappedTickets = await mapPropertiesToTickets(
		tickets,
		cognitoId,
		cityAccountData,
		email
	)

	await basicChecks(cognitoId, mappedTickets, reverseDiscountInPercent, email)

	const pricing = await getOrderPrice(mappedTickets, reverseDiscountInPercent)
	return { mappedTickets, pricing }
}
async function createAndProcessOrder(
	mappedTickets: TicketWithAdditionalProperties[],
	discountCode: DiscountCodeModel,
	pricing: { orderPriceWithVat: number; discount: number }
) {
	const order = await Order.create({
		priceWithVat: 0,
		state: ORDER_STATE.CREATED,
		orderNumber: new Date().getTime(),
	})

	// for each instance add unique ticket
	for (const ticketWithTicketType of mappedTickets) {
		const ticketPrice = await getTicketPrice(
			ticketWithTicketType.isChildren,
			ticketWithTicketType.ticketType
		)

		// TODO creating ticket should happen after transaction is paid,
		// probably there will be problem with age of users,
		// should we take age from user when order is created or when it is paid?
		const createdTicket = await createTicketWithProfile(
			ticketWithTicketType.user,
			ticketWithTicketType.ticketType,
			order.id,
			ticketWithTicketType.isChildren,
			ticketPrice,
			ticketWithTicketType.ticketType.vatPercentage
		)
		if (ticketWithTicketType.ticketType.photoRequired) {
			await uploadProfilePhotos(createdTicket)
		}
	}

	// TODO: we should update discount code after order is paid
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
	return order
}
