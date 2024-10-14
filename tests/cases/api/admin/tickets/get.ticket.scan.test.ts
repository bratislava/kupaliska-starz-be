import {
	CHECK_STATUS,
	ENTRY_TYPE,
	TICKET_CHECKIN_ERROR_CODE,
	TICKET_CHECKOUT_ERROR_CODE,
} from './../../../../../src/utils/enums'
import supertest from 'supertest'
import Joi from 'joi'
import app from '../../../../../src/app'

const allowedSwimmingPool = 'c70954c7-970d-4f1a-acf4-12b91acabe01'
const disallowedSwimmingPool = 'c70954c7-970d-4f1a-acf4-12b91acabe55'
const ticketIdAllowed = process.env.ticketId
const ticketIdDisallowed = 'c70954c7-970d-4f1a-acf4-12b91acabe5a'

const endpoint = (
	swimmingPoolId = allowedSwimmingPool,
	ticketId = ticketIdAllowed
) => `/api/admin/tickets/swimmingPools/${swimmingPoolId}/scan/${ticketId}`

const schema = Joi.object().keys()

describe(`[GET] ${endpoint})`, () => {
	const request = supertest(app)

	it('Expect status 401 | Invalid or missing auth token', async () => {
		const response = await request
			.get(endpoint())
			.set('Content-Type', 'application/json')
		expect(response.status).toBe(401)
	})

	it('Expect status 403 | Unathorized (Base user)', async () => {
		const response = await request
			.get(endpoint())
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${process.env.jwtBase}`)
		expect(response.status).toBe(403)
	})

	it('Response should return code 200', async () => {
		const response = await request
			.get(endpoint())
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${process.env.jwtOperator}`)
		expect(response.status).toBe(200)
		expect(response.type).toBe('application/json')
		expect(schema.validate(response.body).error).toBeUndefined()
		expect(response.body.lastEntry).toBeNull()
	})

	it('Expect status 404 | Invalid ticketId', async () => {
		const response = await request
			.get(endpoint(allowedSwimmingPool, ticketIdDisallowed))
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${process.env.jwtOperator}`)
		expect(response.status).toBe(404)
	})

	it('Get right last entry', async () => {
		jest.useFakeTimers('modern')
		jest.setSystemTime(new Date('2021-05-03 17:19:35'))

		const response = await request
			.get(endpoint(allowedSwimmingPool, process.env.ticket2Id))
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${process.env.jwtOperator}`)
		expect(response.status).toBe(200)

		expect(response.body.lastEntry.timestamp).toBe(
			new Date('2021-05-03 15:19:35').toISOString()
		)
		expect(response.body.lastEntry.type).toBe(ENTRY_TYPE.CHECKIN)
		expect(response.body.lastEntry.swimmingPoolName).toBe('Delfin')

		jest.useRealTimers()
	})

	it('Test error codes when last entry is CHECK-IN', async () => {
		jest.useFakeTimers('modern')
		jest.setSystemTime(new Date('2021-05-03 20:19:35'))
		const response = await request
			.get(endpoint(disallowedSwimmingPool, process.env.ticket2Id))
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${process.env.jwtOperator}`)
		expect(response.status).toBe(200)

		expect(response.body.checkIn.messages).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					code: TICKET_CHECKIN_ERROR_CODE.ORDER_NOT_PAID,
					optionalCheck: false,
				}),
			])
		)
		expect(response.body.checkIn.messages).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					code: TICKET_CHECKIN_ERROR_CODE.FORBIDDEN_SWIMMING_POOL,
					optionalCheck: false,
				}),
			])
		)
		expect(response.body.checkIn.messages).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					code: TICKET_CHECKIN_ERROR_CODE.NOT_BETWEEN_VALID_DATES,
					optionalCheck: false,
				}),
			])
		)
		expect(response.body.checkIn.messages).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					code: TICKET_CHECKIN_ERROR_CODE.CUSTOMER_ALREADY_CHECK_IN,
					optionalCheck: true,
				}),
			])
		)
		expect(response.body.checkIn.messages).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					code: TICKET_CHECKIN_ERROR_CODE.FORBIDDEN_ENTRY_TIME,
					optionalCheck: false,
				}),
			])
		)
		expect(response.body.checkIn.messages).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					code: TICKET_CHECKIN_ERROR_CODE.TICKET_DURATION_EXPIRED,
					optionalCheck: false,
				}),
			])
		)
		expect(response.body.checkIn.messages).not.toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					code: TICKET_CHECKIN_ERROR_CODE.NOT_ENOUGH_REMAINING_ENTRIES,
				}),
			])
		)
		expect(response.body.checkIn.status).toBe(CHECK_STATUS.NOK)

		expect(response.body.checkOut.messages).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					code: TICKET_CHECKOUT_ERROR_CODE.CHECKOUT_AFTER_ALLOWED_TIME,
					optionalCheck: true,
				}),
			])
		)
		expect(response.body.checkOut.messages).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					code: TICKET_CHECKOUT_ERROR_CODE.CHECKOUT_TICKET_DURATION_EXPIRED,
					optionalCheck: true,
				}),
			])
		)
		expect(response.body.checkOut.messages).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					code: TICKET_CHECKOUT_ERROR_CODE.FORBIDDEN_SWIMMING_POOL,
					optionalCheck: true,
				}),
			])
		)
		expect(response.body.checkOut.messages).not.toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					code: TICKET_CHECKOUT_ERROR_CODE.CUSTOMER_DID_NOT_CHECK_IN,
				}),
			])
		)
		expect(response.body.checkOut.status).toBe(CHECK_STATUS.OK)

		jest.useRealTimers()
	})

	it('Test error codes when last entry is CHECK-OUT (or none)', async () => {
		jest.useFakeTimers('modern')
		jest.setSystemTime(new Date('2021-05-03 14:35'))
		const response = await request
			.get(
				endpoint(
					process.env.ticket3AllowedSwimmingPoolId,
					process.env.ticket3Id
				)
			)
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${process.env.jwtOperator}`)
		expect(response.status).toBe(200)

		expect(response.body.checkIn.messages).not.toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					code: TICKET_CHECKIN_ERROR_CODE.ORDER_NOT_PAID,
				}),
			])
		)
		expect(response.body.checkIn.messages).not.toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					code: TICKET_CHECKIN_ERROR_CODE.FORBIDDEN_SWIMMING_POOL,
				}),
			])
		)
		expect(response.body.checkIn.messages).not.toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					code: TICKET_CHECKIN_ERROR_CODE.NOT_BETWEEN_VALID_DATES,
				}),
			])
		)
		expect(response.body.checkIn.messages).not.toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					code: TICKET_CHECKIN_ERROR_CODE.CUSTOMER_ALREADY_CHECK_IN,
				}),
			])
		)
		expect(response.body.checkIn.messages).not.toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					code: TICKET_CHECKIN_ERROR_CODE.FORBIDDEN_ENTRY_TIME,
				}),
			])
		)
		expect(response.body.checkIn.messages).not.toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					code: TICKET_CHECKIN_ERROR_CODE.TICKET_DURATION_EXPIRED,
				}),
			])
		)
		expect(response.body.checkIn.messages).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					code: TICKET_CHECKIN_ERROR_CODE.NOT_ENOUGH_REMAINING_ENTRIES,
					optionalCheck: false,
				}),
			])
		)
		expect(response.body.checkIn.status).toBe(CHECK_STATUS.NOK)

		expect(response.body.checkOut.messages).not.toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					code: TICKET_CHECKOUT_ERROR_CODE.CHECKOUT_AFTER_ALLOWED_TIME,
				}),
			])
		)
		expect(response.body.checkOut.messages).not.toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					code: TICKET_CHECKOUT_ERROR_CODE.CHECKOUT_TICKET_DURATION_EXPIRED,
				}),
			])
		)
		expect(response.body.checkOut.messages).not.toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					code: TICKET_CHECKOUT_ERROR_CODE.FORBIDDEN_SWIMMING_POOL,
				}),
			])
		)
		expect(response.body.checkOut.messages).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					code: TICKET_CHECKOUT_ERROR_CODE.CUSTOMER_DID_NOT_CHECK_IN,
					optionalCheck: true,
				}),
			])
		)
		expect(response.body.checkOut.status).toBe(CHECK_STATUS.OK)

		jest.useRealTimers()
	})

	it('Test OK CHECK-IN', async () => {
		jest.useFakeTimers('modern')
		jest.setSystemTime(new Date('2021-05-03 14:35'))
		const response = await request
			.get(endpoint(process.env.ticketAllowedSwimmingPoolId))
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${process.env.jwtOperator}`)
		expect(response.status).toBe(200)
		expect(response.body.checkIn.status).toBe(CHECK_STATUS.OK)
		expect(response.body.checkOut.status).toBe(CHECK_STATUS.OK)

		jest.useRealTimers()
	})
})
