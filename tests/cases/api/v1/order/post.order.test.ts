jest.mock('../../../../../src/utils/emailSender', () => ({
	sendOrderEmail: jest.fn().mockResolvedValue(undefined),
}))

import supertest from 'supertest'
import app from '../../../../../src/app'
import { ORDER_STATE } from '../../../../../src/utils/enums'
import { OrderModel } from '../../../../../src/db/models/order'
import faker from 'faker'
import jwt from 'jsonwebtoken'
import * as helpers from '../../../../../src/utils/helpers'
import { CityAccountUser } from '../../../../../src/utils/cityAccountDto'
import {
	AccountType,
	ORDER_PAYMENT_METHOD_STATE,
} from '../../../../../src/utils/enums'
import MockDate from 'mockdate'
import {
	workflow,
	workflowDryRun,
	type PostOrderBody,
	type PostOrderDryRunBody,
} from '../../../../../src/api/v1/orders/post.order'
import ErrorBuilder from '../../../../../src/utils/ErrorBuilder'
import { models } from '../../../../../src/db/models'
import { v4 as uuidv4 } from 'uuid'
import i18next from 'i18next'
import config from 'config'
import { IAppConfig } from '../../../../../src/types/interfaces'
import {
	ticketTypeEntriesId,
	ticketTypeExpired,
	ticketTypeSeasonalWithChildren,
	ticketTypeSeasonNameRequired,
} from '../../../../../src/db/seeders/test/01-ticketTypes'
import { DiscountCodeModel } from '../../../../../src/db/models/discountCode'
import {
	discountCodeId,
	discountCodeId2,
	discountCodeId3,
	discountCode,
	discountCode2,
	discountCode3,
	discountCodeUsed,
} from '../../../../../src/db/seeders/test/05-discountCodes'

const { SwimmingLoggedUser } = models

const endpointOrder = '/api/v1/orders'
const endpointGetUnauthenticatedPrice =
	'/api/v1/orders/getPrice/unauthenticated'

const cognitoSub = '00000000-0000-0000-0000-00000000c001'

const appConfig: IAppConfig = config.get('app')

const defaultCityAccount = (): CityAccountUser =>
	({
		sub: cognitoSub,
		email: 'buyer@example.com',
		given_name: 'Test',
		family_name: 'Buyer',
		'custom:account_type': AccountType.FO,
	} as CityAccountUser)

const reqT = (key: string | string[]) =>
	(Array.isArray(key) ? key[0] : key) as string

async function callWorkflow(
	body: PostOrderBody,
	headers: Record<string, string>
) {
	const res = { json: jest.fn() }
	const next = jest.fn()
	await workflow({ body, headers, t: reqT as any } as any, res as any, next)
	return { res, next }
}

async function callDryRun(
	body: PostOrderDryRunBody,
	headers: Record<string, string>
) {
	const res = { json: jest.fn() }
	const next = jest.fn()
	await workflowDryRun(
		{ body, headers, t: reqT as any } as any,
		res as any,
		next
	)
	return { res, next }
}

const expectErrorNext = (next: jest.Mock, status: number, path?: string) => {
	expect(next).toHaveBeenCalled()
	const err = next.mock.calls[0][0] as ErrorBuilder
	expect(err).toBeInstanceOf(ErrorBuilder)
	expect(err.status).toBe(status)
	if (path !== undefined) {
		expect(err.items[0]?.path).toBe(path)
	}
}

describe('POST /api/v1/orders and POST /api/v1/orders/getPrice', () => {
	const request = supertest(app)
	let getCityAccountDataSpy: jest.SpyInstance

	beforeAll(() => {
		getCityAccountDataSpy = jest
			.spyOn(helpers, 'getCityAccountData')
			.mockImplementation(
				async () =>
					({
						sub: '00000000-0000-0000-0000-00000000c001',
						email: 'buyer@example.com',
						given_name: 'Test',
						family_name: 'Buyer',
						'custom:account_type': AccountType.FO,
					} as CityAccountUser)
			)
		MockDate.set(process.env.globalTime as string)
	})

	afterAll(() => {
		MockDate.reset()
		getCityAccountDataSpy.mockRestore()
	})

	const authHeader = {
		Authorization: `Bearer ${jwt.sign(
			{ sub: cognitoSub },
			process.env.JWT_SECRET || 'jwtrandomsecret',
			{
				algorithm: 'HS256',
				expiresIn: '1h',
			}
		)}`,
	}

	describe(`POST ${endpointGetUnauthenticatedPrice}`, () => {
		it('returns 200 with pricing for valid tickets', async () => {
			const response = await request
				.post(endpointGetUnauthenticatedPrice)
				.set('Content-Type', 'application/json')
				.send({
					tickets: [
						{
							ticketTypeId: ticketTypeEntriesId,
							age: 30,
							zip: '81101',
						},
					],
				})

			expect(response.status).toBe(200)
			expect(response.type).toBe('application/json')
			expect(response.body.data.pricing).toEqual({
				orderPriceWithVat: 3999,
				discount: 0,
			})
		})
		it('returns 200 with pricing for valid tickets with discount applied', async () => {
			const response = await request
				.post(endpointGetUnauthenticatedPrice)
				.set('Content-Type', 'application/json')
				.send({
					tickets: [
						{
							ticketTypeId: ticketTypeEntriesId,
							age: 30,
							zip: '81101',
						},
					],
					discountsPercent: [
						{
							ticketTypeId: ticketTypeEntriesId,
							discountPercent: 10,
						},
					],
				})

			expect(response.status).toBe(200)
			expect(response.type).toBe('application/json')
			expect(response.body.data.pricing).toEqual({
				orderPriceWithVat: 3599,
				discount: 400,
			})
		})
	})

	//   add test for recaptcha token

	describe(`POST ${endpointOrder}`, () => {
		it('returns 401 without Bearer token', async () => {
			const response = await request
				.post(endpointOrder)
				.set('Content-Type', 'application/json')
				.send({
					tickets: [
						{
							ticketTypeId: ticketTypeEntriesId,
							age: 30,
							zip: '81101',
						},
					],
					paymentMethod: ORDER_PAYMENT_METHOD_STATE.CARD,
					email: faker.internet.email(),
				})

			expect(response.status).toBe(401)
		})

		it('returns 400 when agreement is missing', async () => {
			const response = await request
				.post(endpointOrder)
				.set('Content-Type', 'application/json')
				.set(authHeader)
				.send({
					tickets: [
						{
							ticketTypeId: ticketTypeEntriesId,
							age: 30,
							zip: '81101',
						},
					],
					paymentMethod: ORDER_PAYMENT_METHOD_STATE.CARD,
				})

			expect(response.status).toBe(400)
			expect(response.body.error).toBe('Invalid data')
			expect(response.body.details[0].message).toBe(
				i18next.t('error:ticket.agreementMissing')
			)
		})

		it('creates order and returns payment payload (200)', async () => {
			const response = await request
				.post(endpointOrder)
				.set('Content-Type', 'application/json')
				.set(authHeader)
				.send({
					tickets: [
						{
							ticketTypeId: ticketTypeEntriesId,
							age: 30,
							zip: '81101',
						},
					],
					agreement: true,
					paymentMethod: ORDER_PAYMENT_METHOD_STATE.CARD,
				})

			expect(response.status).toBe(200)
			expect(response.type).toBe('application/json')
			const order = await OrderModel.findByPk(response.body.data.id, {
				include: [
					{ association: 'tickets' },
					{ association: 'paymentOrder' },
				],
			})
			expect(order).toBeTruthy()
			expect(order!.tickets.length).toBe(1)
			expect(order!.paymentOrder).toBeTruthy()
		})
		describe('business logic tests', () => {
			it('Should have correct price (Ticket with children)', async () => {
				const response = await request
					.post(endpointOrder)
					.set('Content-Type', 'application/json')
					.set(authHeader)
					.send({
						tickets: [
							{
								ticketTypeId: ticketTypeSeasonalWithChildren,
								zip: '03251',
							},
							{
								ticketTypeId: ticketTypeSeasonalWithChildren,
								age: 10,
							},
							{
								ticketTypeId: ticketTypeSeasonalWithChildren,
								age: 10,
							},
						],
						agreement: true,
						paymentMethod: ORDER_PAYMENT_METHOD_STATE.CARD,
						token: 'recaptcha123',
					})

				expect(response.status).toBe(200)
				const order = await OrderModel.findByPk(response.body.data.id, {
					include: {
						association: 'tickets',
						order: [['priceWithVat', 'DESC']],
					},
				})
				expect(order?.priceWithVat).toStrictEqual(2200)
				expect(order?.tickets[0].priceWithVat).toStrictEqual(2000)
				expect(order?.tickets[1].priceWithVat).toStrictEqual(100)
				expect(order?.tickets[2].priceWithVat).toStrictEqual(100)
			})
			it('Should have correct price (Ticket with quantity)', async () => {
				const response = await request
					.post(endpointOrder)
					.set('Content-Type', 'application/json')
					.set(authHeader)
					.send({
						tickets: [
							...Array.from({ length: 4 }, () => ({
								ticketTypeId: ticketTypeEntriesId,
								age: 18,
								zip: '03251',
							})),
						],
						agreement: true,
						paymentMethod: ORDER_PAYMENT_METHOD_STATE.CARD,
						token: 'recaptcha123',
					})
				expect(response.status).toBe(200)
				const order = await OrderModel.findByPk(response.body.data.id, {
					include: [
						{ association: 'tickets' },
						{ association: 'paymentOrder' },
					],
				})
				expect(order?.state).toStrictEqual(ORDER_STATE.CREATED)
				expect(order?.priceWithVat).toStrictEqual(15996)
				order?.tickets.forEach((ticket) => {
					expect(ticket.priceWithVat).toStrictEqual(3999)
				})
				expect(order?.paymentOrder.paymentAmount).toBe(15996)
				expect(response.body.data.id).toStrictEqual(order?.id)
			})
		})
	})

	describe('post.order.ts throws (ErrorBuilder & validate)', () => {
		beforeEach(() => {
			getCityAccountDataSpy.mockImplementation(async () =>
				defaultCityAccount()
			)
		})

		describe('basicChecks', () => {
			it('throws minimumIsOneAdult when all tickets are children', async () => {
				const { next } = await callWorkflow(
					{
						tickets: [
							{
								ticketTypeId: ticketTypeSeasonNameRequired,
								age: 38,
							},
							{
								ticketTypeId: ticketTypeSeasonalWithChildren,
								age: 8,
								zip: '81101',
							},
							{
								ticketTypeId: ticketTypeSeasonalWithChildren,
								age: 9,
								zip: '81101',
							},
						],
						agreement: true,
						paymentMethod: ORDER_PAYMENT_METHOD_STATE.CARD,
					},
					{ authorization: 'Bearer t' }
				)
				expectErrorNext(next, 400)
				expect(
					(next.mock.calls[0][0] as ErrorBuilder).items[0].message
				).toBe(i18next.t('error:ticket.minimumIsOneAdult'))
			})

			it('throws maxtTicketsPerOrder when ticket count exceeds limit', async () => {
				const { next } = await callWorkflow(
					{
						tickets: Array.from(
							{
								length:
									Number(appConfig.maxTicketPurchaseLimit) +
									1,
							},
							() => ({
								ticketTypeId: ticketTypeEntriesId,
								age: 30,
								zip: '81101',
							})
						),
						agreement: true,
						paymentMethod: ORDER_PAYMENT_METHOD_STATE.CARD,
					},
					{ authorization: 'Bearer t' }
				)
				expectErrorNext(next, 400)
				expect(
					(next.mock.calls[0][0] as ErrorBuilder).items[0].message
				).toBe(
					i18next.t('error:ticket.maxtTicketsPerOrder', {
						maxTicketsPerOrder: appConfig.maxTicketPurchaseLimit,
					})
				)
			})

			it('throws ticketTypeNotFound for unknown ticketTypeId', async () => {
				const { next } = await callWorkflow(
					{
						tickets: [
							{
								ticketTypeId: uuidv4(),
								age: 30,
								zip: '81101',
							},
						],
						agreement: true,
						paymentMethod: ORDER_PAYMENT_METHOD_STATE.CARD,
					},
					{ authorization: 'Bearer t' }
				)
				expectErrorNext(next, 404)
				expect(
					(next.mock.calls[0][0] as ErrorBuilder).items[0].message
				).toBe(i18next.t('error:ticketTypeNotFound'))
			})

			it('throws discountOnlyForOneUser when multiple adults share a partial dry-run discount', async () => {
				const { next } = await callDryRun(
					{
						tickets: [
							{
								ticketTypeId: ticketTypeEntriesId,
								age: 30,
								zip: '81101',
							},
							{
								ticketTypeId: ticketTypeEntriesId,
								age: 31,
								zip: '81101',
							},
						],
						discountsPercent: [
							{
								ticketTypeId: ticketTypeEntriesId,
								discountPercent: 15,
							},
						],
					},
					{ authorization: 'Bearer t' }
				)
				expectErrorNext(next, 400)
				expect(
					(next.mock.calls[0][0] as ErrorBuilder).items[0].message
				).toBe(i18next.t('error:ticket.discountOnlyForOneUser'))
			})

			it('throws notLoggedUserForTicket for nameRequired ticket without authorization header', async () => {
				const { next } = await callWorkflow(
					{
						tickets: [
							{
								ticketTypeId: ticketTypeSeasonNameRequired,
								age: 30,
								zip: '81101',
							},
						],
						agreement: true,
						paymentMethod: ORDER_PAYMENT_METHOD_STATE.CARD,
					},
					{}
				)
				expectErrorNext(next, 401)
				expect(
					(next.mock.calls[0][0] as ErrorBuilder).items[0].message
				).toBe(i18next.t('error:ticket.notLoggedUserForTicket'))
			})

			it('throws ticketHasExpired for expired ticket type', async () => {
				const { next } = await callWorkflow(
					{
						tickets: [
							{
								ticketTypeId: ticketTypeExpired,
								age: 30,
								zip: '81101',
							},
						],
						agreement: true,
						paymentMethod: ORDER_PAYMENT_METHOD_STATE.CARD,
					},
					{ authorization: 'Bearer t' }
				)
				expectErrorNext(next, 400, 'ticketHasExpired')
				expect(
					(next.mock.calls[0][0] as ErrorBuilder).items[0].message
				).toBe(i18next.t('error:ticket.ticketHasExpired'))
			})

			it('throws userNotAllowedTicketType for non-FO account on nameRequired ticket', async () => {
				const logged = await SwimmingLoggedUser.create({
					externalCognitoId: cognitoSub,
					externalAzureId: uuidv4(),
					age: 30,
					zip: '81101',
				})
				getCityAccountDataSpy.mockResolvedValueOnce({
					...defaultCityAccount(),
					'custom:account_type': AccountType.PO,
				} as CityAccountUser)

				try {
					const { next } = await callWorkflow(
						{
							tickets: [
								{
									ticketTypeId: ticketTypeSeasonNameRequired,
									personId: null,
									age: 30,
									zip: '81101',
								},
							],
							agreement: true,
							paymentMethod: ORDER_PAYMENT_METHOD_STATE.CARD,
						},
						{ authorization: 'Bearer t' }
					)

					expectErrorNext(next, 400)
					expect(
						(next.mock.calls[0][0] as ErrorBuilder).items[0].message
					).toBe(i18next.t('error:ticket.userNotAllowedTicketType'))
				} finally {
					await logged.destroy({ force: true })
				}
			})

			it('throws numberOfChildrenExceeded when too many children for ticket type', async () => {
				const tickets = [
					{
						ticketTypeId: ticketTypeSeasonalWithChildren,
						age: 30,
						zip: '81101',
					},
					...Array.from(
						{
							length: 3, //more than ticketTypeSeasonalWithChildren.childrenMaxNumber,
						},
						() => ({
							ticketTypeId: ticketTypeSeasonalWithChildren,
							age: 10,
							zip: '81101',
						})
					),
				]

				const { next } = await callWorkflow(
					{
						tickets: tickets,
						agreement: true,
						paymentMethod: ORDER_PAYMENT_METHOD_STATE.CARD,
					},
					{ authorization: 'Bearer t' }
				)
				expectErrorNext(next, 400, 'numberOfChildrenExceeded')
				expect(
					(next.mock.calls[0][0] as ErrorBuilder).items[0].message
				).toBe(i18next.t('error:ticket.numberOfChildrenExceeded'))
			})
		})

		describe('workflow', () => {
			it('throws ticket.emailIsEmpty when city account and body email is missing', async () => {
				const { next } = await callWorkflow(
					{
						tickets: [
							{
								ticketTypeId: ticketTypeEntriesId,
								age: 30,
								zip: '81101',
							},
						],
						agreement: true,
						paymentMethod: ORDER_PAYMENT_METHOD_STATE.CARD,
					},
					{}
				)
				expectErrorNext(next, 400)
				expect(
					(next.mock.calls[0][0] as ErrorBuilder).items[0].message
				).toBe(i18next.t('error:ticket.emailIsEmpty'))
			})

			it('throws emailIsEmpty when city account email is empty and body email is missing', async () => {
				getCityAccountDataSpy.mockResolvedValueOnce({
					...defaultCityAccount(),
					email: '',
				} as CityAccountUser)

				const { next } = await callWorkflow(
					{
						tickets: [
							{
								ticketTypeId: ticketTypeEntriesId,
								age: 30,
								zip: '81101',
							},
						],
						agreement: true,
						paymentMethod: ORDER_PAYMENT_METHOD_STATE.CARD,
					},
					{ authorization: 'Bearer t' }
				)
				expectErrorNext(next, 400)
				expect(
					(next.mock.calls[0][0] as ErrorBuilder).items[0].message
				).toBe(i18next.t('error:ticket.emailIsEmpty'))
			})

			//  error:ticket.userNotFound is unreachable code, because cityAccountData is always present when we have swimmingLoggedUser

			it('throws swimmingLoggedUserNotFound when cityAccountData is present and SwimmingLoggedUser is missing', async () => {
				const { next } = await callWorkflow(
					{
						tickets: [
							{
								ticketTypeId: ticketTypeEntriesId,
								personId: null,
								age: 30,
								zip: '81101',
							},
						],
						agreement: true,
						paymentMethod: ORDER_PAYMENT_METHOD_STATE.CARD,
					},
					{ authorization: 'Bearer t' }
				)
				expectErrorNext(next, 401)
				expect(
					(next.mock.calls[0][0] as ErrorBuilder).items[0].message
				).toBe(i18next.t('error:ticket.swimmingLoggedUserNotFound'))
			})

			it('throws emailNotFoundOnUser when personId is null but city account has empty email', async () => {
				const logged = await SwimmingLoggedUser.create({
					externalCognitoId: cognitoSub,
					externalAzureId: uuidv4(),
					age: 30,
					zip: '81101',
				})
				getCityAccountDataSpy.mockResolvedValueOnce({
					...defaultCityAccount(),
					email: '',
				} as CityAccountUser)

				try {
					const { next } = await callWorkflow(
						{
							tickets: [
								{
									ticketTypeId: ticketTypeEntriesId,
									personId: null,
									age: 30,
									zip: '81101',
								},
							],
							agreement: true,
							paymentMethod: ORDER_PAYMENT_METHOD_STATE.CARD,
						},
						{ authorization: 'Bearer t' }
					)

					expectErrorNext(next, 500)
					expect(
						(next.mock.calls[0][0] as ErrorBuilder).items[0].message
					).toBe(i18next.t('error:ticket.emailNotFoundOnUser'))
				} finally {
					await logged.destroy({ force: true })
				}
			})

			it('throws associatedSwimmerNotExists for unknown personId', async () => {
				const logged = await SwimmingLoggedUser.create({
					externalCognitoId: cognitoSub,
					externalAzureId: uuidv4(),
					age: 30,
					zip: '81101',
				})

				try {
					const { next } = await callWorkflow(
						{
							tickets: [
								{
									ticketTypeId: ticketTypeEntriesId,
									personId: uuidv4(),
									age: 10,
									zip: '81101',
								},
							],
							agreement: true,
							paymentMethod: ORDER_PAYMENT_METHOD_STATE.CARD,
						},
						{ authorization: 'Bearer t' }
					)

					expectErrorNext(next, 404)
					expect(
						(next.mock.calls[0][0] as ErrorBuilder).items[0].message
					).toBe(i18next.t('error:associatedSwimmerNotExists'))
				} finally {
					await logged.destroy({ force: true })
				}
			})
		})
	})

	describe('business logic tests', () => {
		describe('Order with discount code', () => {
			afterEach(async () => {
				await DiscountCodeModel.update(
					{ usedAt: null, orderId: null },
					{
						where: {
							id: [
								discountCodeId,
								discountCodeId2,
								discountCodeId3,
							],
						},
					}
				)
			})
			it('Order should have correct discount', async () => {
				const response = await request
					.post(endpointOrder)
					.set(authHeader)
					.set('Content-Type', 'application/json')
					.send({
						tickets: [
							{
								ticketTypeId: ticketTypeEntriesId,
								age: 18,
								zip: '03251',
							},
						],
						discountCodes: [discountCode],
						agreement: true,
						paymentMethod: ORDER_PAYMENT_METHOD_STATE.CARD,
						token: 'recaptcha123',
					})

				expect(response.status).toBe(200)
				const order = await OrderModel.findByPk(response.body.data.id, {
					include: [{ association: 'discountCodes' }],
				})
				expect(order?.priceWithVat).toStrictEqual(3199)
				expect(order?.discount).toStrictEqual(800)
				const discountCodeInstance = await DiscountCodeModel.findByPk(
					discountCodeId
				)
				expect(discountCodeInstance?.usedAt).not.toBeNull()
				expect(order?.discountCodes[0].id).toBe(discountCodeId)
			})

			it('Order should have correct discount for multiple discount codes present in the request', async () => {
				const response = await request
					.post(endpointOrder)
					.set(authHeader)
					.set('Content-Type', 'application/json')
					.send({
						tickets: [
							{
								ticketTypeId: ticketTypeSeasonalWithChildren, //2000 - 30%  = 1400
								age: 18,
								zip: '03251',
							},
							{
								ticketTypeId: ticketTypeEntriesId, //3999 - 20% = 3199.2
								age: 18,
								zip: '03251',
							},
						],
						discountCodes: [discountCode2, discountCode3],
						agreement: true,
						paymentMethod: ORDER_PAYMENT_METHOD_STATE.CARD,
						token: 'recaptcha123',
					})

				expect(response.status).toBe(200)
				const order = await OrderModel.findByPk(response.body.data.id, {
					include: [{ association: 'discountCodes' }],
				})
				expect(order?.priceWithVat).toStrictEqual(4599)
				expect(order?.discount).toStrictEqual(1400)
				const discountCodeInstance2 = await DiscountCodeModel.findByPk(
					discountCodeId2
				)
				const discountCodeInstance3 = await DiscountCodeModel.findByPk(
					discountCodeId3
				)
				expect(discountCodeInstance2?.usedAt).not.toBeNull()
				expect(discountCodeInstance3?.usedAt).not.toBeNull()
				expect(order?.discountCodes[0].id).toBe(discountCodeId2)
				expect(order?.discountCodes[1].id).toBe(discountCodeId3)
			})
			it('throws discountCodeNotValid when discount code is not found', async () => {
				const { next } = await callWorkflow(
					{
						tickets: [
							{
								ticketTypeId: ticketTypeEntriesId,
								age: 18,
								zip: '03251',
							},
						],
						discountCodes: ['RRRRRRRR'],
						agreement: true,
						paymentMethod: ORDER_PAYMENT_METHOD_STATE.CARD,
					},
					{ authorization: 'Bearer t' }
				)
				expectErrorNext(next, 404)
				expect(
					(next.mock.calls[0][0] as ErrorBuilder).items[0].message
				).toBe(i18next.t('error:discountCodeNotValid'))
			})
			it('throws discountCodeNotValid when discount code is already used', async () => {
				const { next } = await callWorkflow(
					{
						tickets: [
							{
								ticketTypeId: ticketTypeEntriesId,
								age: 18,
								zip: '03251',
							},
						],
						discountCodes: [discountCodeUsed],
						agreement: true,
						paymentMethod: ORDER_PAYMENT_METHOD_STATE.CARD,
					},
					{ authorization: 'Bearer t' }
				)
				expectErrorNext(next, 404)
				expect(
					(next.mock.calls[0][0] as ErrorBuilder).items[0].message
				).toBe(i18next.t('error:discountCodeNotValid'))
			})
		})
	})
})
