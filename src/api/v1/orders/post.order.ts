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
import { createJwt } from '../../../utils/authorization'
import { sendOrderEmail } from '../../../utils/emailSender'
import {
	getDiscount,
	getCityAccountData,
	payOrderWithNextOrderNumber,
	isDefined,
	getInverseDiscountInPercent,
	getAdultsAndChildrenCountForTicketType,
} from '../../../utils/helpers'
import { TicketModel } from '../../../db/models/ticket'
import { FE_ROUTES } from '../../../utils/constants'
import { CityAccountUser } from '../../../utils/cityAccountDto'
import i18next from 'i18next'
import { DiscountCodeModel } from '../../../db/models/discountCode'
import { SwimmingLoggedUserModel } from '../../../db/models/swimmingLoggedUser'
import { groupBy, random } from 'lodash'

const {
	SwimmingLoggedUser,
	AssociatedSwimmer,
	Order,
	Ticket,
	TicketType,
	DiscountCode,
	File,
} = models

interface User {
	associatedSwimmerId: string | null
	loggedUserId: string | null
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

export const postOrderCommonBodySchema = z.object({
	tickets: z.array(postOrderTicketSchema).min(1, {
		message: i18next.t('error:ticket.minimumOneTicket'),
	}),
})

export const postOrderDryRunBodySchema = postOrderCommonBodySchema.extend({
	discountsPercent: z
		.array(
			z.object({ ticketTypeId: z.uuid(), discountPercent: z.number() })
		)
		.optional(),
})

export const postOrderBodySchema = postOrderCommonBodySchema.extend({
	discountCodes: z.array(z.string().min(5).max(20)).optional(),
	agreement: z.literal<boolean>(true, {
		error: () => ({ message: i18next.t('error:ticket.agreementMissing') }),
	}),
	paymentMethod: z.enum(ORDER_PAYMENT_METHOD_STATE),
	email: z.email().max(255).optional(),
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
	body: postOrderCommonBodySchema,
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
	isChildTicket: boolean
	user: User
	discount?: {
		discountPercent: number
		inverseDiscountInPercent: number
	}
	discountCode?: DiscountCodeModel
	priceWithVat: number
}

export const workflowDryRun = async (
	req: RequestPostOrderDryRun,
	res: Response,
	next: NextFunction
) => {
	try {
		const { body } = req

		const cityAccountData = req.headers.authorization
			? await getCityAccountData(req.headers.authorization)
			: null

		const { mappedTickets } = await getMappedTickets(
			body.tickets,
			cityAccountData,
			body.discountsPercent,
			undefined
		)
		const pricing = await getOrderPrice(mappedTickets)
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

		// TODO this should live in authorization middleware and attach the city account data to the request object
		const cityAccountData = req.headers.authorization
			? await getCityAccountData(req.headers.authorization)
			: null

		const { mappedTickets } = await getMappedTickets(
			body.tickets,
			cityAccountData,
			undefined,
			body.discountCodes ?? []
		)
		const pricing = await getOrderPrice(mappedTickets)

		const email = body.email ?? cityAccountData?.email ?? null

		if (!email) {
			throw new ErrorBuilder(400, i18next.t('error:ticket.emailIsEmpty'))
		}
		const order = await createAndProcessOrder(email, mappedTickets, pricing)
		if (
			mappedTickets.every((ticket) => ticket.discountCode?.amount === 100)
		) {
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

// TODO use same computation here and in pdfGenerator.ts
// Compute price
const getOrderPrice = async (
	ticketsWithAdditionalProperties: TicketWithAdditionalProperties[]
) => {
	let orderPriceWithVat = 0
	let discount = 0

	//price computation
	for (const ticketWithAdditionalProperties of ticketsWithAdditionalProperties) {
		const { isChildTicket, ticketType } = ticketWithAdditionalProperties
		const ticketPrice = getTicketPrice(isChildTicket, ticketType)

		let totals = { newTicketsPrice: ticketPrice, discount: discount }
		if (
			ticketWithAdditionalProperties.discount
				?.inverseDiscountInPercent !== undefined
		) {
			totals = getDiscount(
				ticketPrice,
				ticketWithAdditionalProperties.discount.inverseDiscountInPercent
			)
		}
		orderPriceWithVat += totals.newTicketsPrice
		discount += totals.discount
	}
	return {
		orderPriceWithVat,
		discount,
	}
}

const getTicketPrice = (
	isChildTicket: boolean,
	ticketType: TicketTypeModel
) => {
	return isChildTicket
		? ticketType.childrenPriceWithVat
		: ticketType.priceWithVat
}

// TODO: this should be refactored
/**
 * Get user data from asociate swimmers or users
 */
const getUser = async (
	ticket: PostOrderTicket,
	swimmingLoggedUser: SwimmingLoggedUserModel | null,
	cityAccountData: Partial<CityAccountUser> | null
): Promise<User> => {
	if (ticket.personId === undefined) {
		return {
			associatedSwimmerId: null,
			loggedUserId: null,
			name: '',
			age: ticket.age ?? null,
			zip: ticket.zip ?? null,
		}
	}

	if (!swimmingLoggedUser)
		throw new ErrorBuilder(
			401,
			i18next.t('error:ticket.swimmingLoggedUserNotFound')
		)
	if (!cityAccountData)
		// for the time being this is unreachable code, because cityAccountData is always present when we have swimmingLoggedUser
		// therefore no testing for this case
		throw new ErrorBuilder(401, i18next.t('error:ticket.userNotFound'))
	if (!cityAccountData.email)
		throw new ErrorBuilder(
			500,
			i18next.t('error:ticket.emailNotFoundOnUser')
		)
	if (ticket.personId === null) {
		return {
			associatedSwimmerId: null,
			loggedUserId: swimmingLoggedUser.id,
			name: [cityAccountData.given_name, cityAccountData.family_name]
				.filter(isDefined)
				.join(' '),
			age: swimmingLoggedUser.age,
			zip: swimmingLoggedUser.zip,
			cityAccountType: cityAccountData['custom:account_type'],
		}
	}
	// should we check if associatedSwimmer is linked to the swimmingLoggedUser?
	const associatedSwimmer = await AssociatedSwimmer.findByPk(ticket.personId)
	if (!associatedSwimmer) {
		throw new ErrorBuilder(
			404,
			i18next.t('error:associatedSwimmerNotExists')
		)
	}

	return {
		associatedSwimmerId: associatedSwimmer.id,
		loggedUserId: swimmingLoggedUser.id,
		name: associatedSwimmer.firstname + ' ' + associatedSwimmer.lastname,
		age: associatedSwimmer.age,
		zip: associatedSwimmer.zip,
	}
}

const getIsChildTicketForTicketType = (
	user: User,
	ticketType: TicketTypeModel
) => {
	let isChildTicket = false
	if (
		ticketType.childrenAllowed &&
		user.age &&
		user.age >= ticketType.childrenAgeFrom &&
		user.age <= ticketType.childrenAgeTo
	) {
		isChildTicket = true
	}
	return isChildTicket
}

/**
 * Persist ticket with profile and his children. Also save profile IDs to the ticket object for later use when uploading profile photos.
 */
const createTicketWithProfile = async (
	email: string,
	user: User,
	ticketType: TicketTypeModel,
	orderId: string,
	isChildTicket: boolean,
	priceWithVat: number,
	vatPercentage: number
) => {
	const profileId = uuidv4()
	// this was used in the now commented out uploadProfilePhotos - since that one was kept in code keeping this as well
	// ;(ticket.modelIds || (ticket.modelIds = [])).push(profileId)
	return await Ticket.create(
		{
			isChildren: isChildTicket,
			ticketTypeId: ticketType.id,
			orderId,
			priceWithVat,
			vatPercentage,
			remainingEntries: ticketType.entriesNumber,
			swimmingLoggedUserId: user.loggedUserId,
			associatedSwimmerId: user.associatedSwimmerId,
			profile: {
				id: profileId,
				email,
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

const basicChecks = async (
	ticketsWithTicketType: TicketWithAdditionalProperties[],
	userLogged: boolean
) => {
	const numberOfChildren = ticketsWithTicketType.filter(
		(ticketWithTicketType) => ticketWithTicketType.isChildTicket
	).length

	const numberOfAdults = ticketsWithTicketType.length - numberOfChildren
	// by default all of tickets appears as for adults, "children tickets" are used here to have discounted price for for ticket combos with children,
	// orders which contains ticket that have this combo feature (children allowed) must have at least one adult ticket
	if (numberOfAdults < 1) {
		throw new ErrorBuilder(400, i18next.t('error:ticket.minimumIsOneAdult'))
	}

	// check maximum tickets
	if (ticketsWithTicketType.length > appConfig.maxTicketPurchaseLimit) {
		throw new ErrorBuilder(
			400,
			i18next.t('error:ticket.maxtTicketsPerOrder')
		)
	}
	// TODO do this better
	const ticketsGroupedByTicketTypes = groupBy(
		ticketsWithTicketType,
		'ticketType.id'
	)
	for (const ticketsWithSameTicketType of Object.values(
		ticketsGroupedByTicketTypes
	)) {
		// all tickets with same ticket type have same discount
		const discountPercent =
			ticketsWithSameTicketType[0].discount?.discountPercent

		const { numberOfAdultsForTicketType, numberOfChildrenForTicketType } =
			getAdultsAndChildrenCountForTicketType(ticketsWithSameTicketType)

		// discount is ment to be used only for one adult ticket
		if (
			numberOfAdultsForTicketType > 1 &&
			discountPercent !== undefined &&
			discountPercent !== 0
		) {
			throw new ErrorBuilder(
				400,
				i18next.t('error:ticket.discountOnlyForOneUser')
			)
		}

		const ticketType =
			ticketsWithSameTicketType.length > 0
				? ticketsWithSameTicketType[0].ticketType
				: null
		if (!ticketType) {
			throw new ErrorBuilder(404, i18next.t('error:ticketTypeNotFound'))
		}
		// children allowed rules
		if (ticketType.childrenAllowed) {
			validate(
				true,
				numberOfChildrenForTicketType,
				Joi.number().max(ticketType.childrenMaxNumber),
				i18next.t('error:ticket.numberOfChildrenExceeded'),
				'numberOfChildrenExceeded'
			)
		}
	}
	ticketsWithTicketType.forEach((ticketWithTicketType) => {
		if (ticketWithTicketType.ticketType.nameRequired && !userLogged) {
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
	})
}
const mapPropertiesToTickets = async (
	tickets: PostOrderTicket[],
	swimmingLoggedUser: SwimmingLoggedUserModel | null,
	cityAccountData: Partial<CityAccountUser> | null,
	discountsPercentObj?: {
		ticketTypeId: string
		discountPercent: number
	}[],
	discountCodes?: string[]
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

	const discountCodesModels = discountCodes
		? await DiscountCode.findAll({
				where: {
					code: {
						[Op.in]: discountCodes,
					},
				},
				order: [['amount', 'DESC']],
				include: {
					association: 'ticketTypes',
				},
		  })
		: []
	const ticketsWithTicketType = await Promise.all(
		tickets.map(async (ticket) => {
			const ticketType = ticketTypes.find(
				(ticketType) => ticketType.id === ticket.ticketTypeId
			)
			if (!ticketType)
				throw new ErrorBuilder(
					404,
					i18next.t('error:ticketTypeNotFound')
				)

			// earlier we sorted discount codes by amount in descending order so code below will pick the highest discount code for given ticket type
			const currentDiscountCodeModel = discountCodesModels.find(
				(discountCode) =>
					discountCode.ticketTypes.some(
						(ticketType) => ticketType.id === ticket.ticketTypeId
					)
			)

			const currentDiscountPercent = discountsPercentObj?.find(
				(discountPercentObj) =>
					discountPercentObj.ticketTypeId === ticket.ticketTypeId
			)?.discountPercent

			let discountPercent = 0
			let inverseDiscountInPercent = 100

			if (currentDiscountCodeModel) {
				discountPercent = currentDiscountCodeModel.amount
				inverseDiscountInPercent =
					currentDiscountCodeModel.getInverseAmount
			} else if (currentDiscountPercent !== undefined) {
				discountPercent = currentDiscountPercent
				inverseDiscountInPercent = getInverseDiscountInPercent(
					currentDiscountPercent
				)
			}
			const ticketWithTicketType = {
				...ticket,
				ticketType: ticketType,
			}
			const user = await getUser(
				ticketWithTicketType,
				swimmingLoggedUser,
				cityAccountData
			)
			const isChildTicket = getIsChildTicketForTicketType(
				user,
				ticketType
			)

			const priceWithVat = await getTicketPrice(isChildTicket, ticketType)

			return {
				...ticket,
				ticketType,
				isChildTicket,
				user,
				priceWithVat,
				discount: {
					discountPercent,
					inverseDiscountInPercent,
				},
				discountCode: currentDiscountCodeModel,
			}
		})
	)
	return ticketsWithTicketType
}
const getMappedTickets = async (
	tickets: PostOrderTicket[],
	cityAccountData: Partial<CityAccountUser> | null,
	discountsPercent?: { ticketTypeId: string; discountPercent: number }[],
	discountCodes?: string[]
) => {
	const swimmingLoggedUser = cityAccountData?.sub
		? await SwimmingLoggedUser.findOne({
				where: { externalCognitoId: cityAccountData?.sub },
		  })
		: null

	// TODO swimmingLoggedUser and cityAccountData should be combined into a single object
	const mappedTickets = await mapPropertiesToTickets(
		tickets,
		swimmingLoggedUser,
		cityAccountData,
		discountsPercent,
		discountCodes
	)

	await basicChecks(mappedTickets, !!cityAccountData?.sub)

	return { mappedTickets }
}

// TODO we should use transaction here
const createAndProcessOrder = async (
	email: string,
	mappedTickets: TicketWithAdditionalProperties[],
	pricing: { orderPriceWithVat: number; discount: number }
) => {
	const order = await Order.create({
		priceWithVat: 0,
		state: ORDER_STATE.CREATED,
		// TODO fix this race condition in separate PR
		orderNumber: new Date().getTime() + random(1, 100).toString(), // tests runs too fast and creates same order number :)
	})
	// for each instance add unique ticket
	for (const ticketWithTicketType of mappedTickets) {
		// TODO creating ticket should happen after transaction is paid,
		// probably there will be problem with age of users,
		// should we take age from user when order is created or when it is paid?
		const createdTicket = await createTicketWithProfile(
			email,
			ticketWithTicketType.user,
			ticketWithTicketType.ticketType,
			order.id,
			ticketWithTicketType.isChildTicket,
			ticketWithTicketType.priceWithVat,
			ticketWithTicketType.ticketType.vatPercentage
		)
		if (ticketWithTicketType.ticketType.photoRequired) {
			await uploadProfilePhotos(createdTicket)
		}
		// TODO: we should update discount code after order is paid
		// not possible because user will create multiple orders with the same discount code and waiting in payment screen and pay later
		// possible solution is to have data in discount code "in progress" which will not allow further usage and update it after order is paid
		// but when to unblock it?
		if (ticketWithTicketType.discountCode) {
			await ticketWithTicketType.discountCode.update({
				usedAt: Sequelize.literal('CURRENT_TIMESTAMP'),
				orderId: order.id,
			})
		}
	}

	await order.update({
		priceWithVat: pricing.orderPriceWithVat,
		discount: pricing.discount,
	})
	return order
}
