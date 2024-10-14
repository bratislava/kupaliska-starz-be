import {
	CHECK_STATUS,
	ENTRY_FLAG,
	ENTRY_TYPE,
	TICKET_CHECKIN_ERROR_CODE,
} from './../../../../../src/utils/enums'
import supertest from 'supertest'
import Joi from 'joi'
import app from '../../../../../src/app'
import { TicketModel } from '../../../../../src/db/models/ticket'

const allowedSwimmingPool = 'c70954c7-970d-4f1a-acf4-12b91acabe01'

const endpoint = (
	swimmingPoolId = allowedSwimmingPool,
	ticketId = process.env.ticketId
) => `/api/admin/tickets/swimmingPools/${swimmingPoolId}/checkin/${ticketId}`
const disallowedSwimmingPool = 'c70954c7-970d-4f1a-acf4-12b91acabe55'

const schema = Joi.object().keys()

describe(`[POST] ${endpoint})`, () => {
	const request = supertest(app)

	it('Expect status 401 | Invalid or missing auth token', async () => {
		const response = await request
			.post(endpoint())
			.set('Content-Type', 'application/json')
		expect(response.status).toBe(401)
	})

	it('Expect status 403 | Unathorized (Base user)', async () => {
		const response = await request
			.post(endpoint())
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${process.env.jwtBase}`)
		expect(response.status).toBe(403)
	})

	it('Check-in create new entry and decrement', async () => {
		const prevTicket = (await TicketModel.findByPk(
			process.env.ticketId
		)) as TicketModel

		jest.useFakeTimers('modern')
		jest.setSystemTime(new Date('2021-05-03 14:35'))
		const response = await request
			.post(endpoint(process.env.ticketAllowedSwimmingPoolId))
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${process.env.jwtOperator}`)
		expect(response.status).toBe(200)
		expect(response.body.status).toBe(CHECK_STATUS.OK)

		const ticket = (await TicketModel.findByPk(process.env.ticketId, {
			include: {
				association: 'entries',
				separate: true,
				order: [['timestamp', 'desc']],
				limit: 1,
			},
		})) as TicketModel

		expect(ticket.entries[0]).toBeTruthy()
		expect(ticket.entries[0].type).toBe(ENTRY_TYPE.CHECKIN)
		expect(ticket.entries[0].flag).toBe(ENTRY_FLAG.MANUAL)
		expect(ticket.entries[0].employeeId).toBe(process.env.operatorId)
		expect(ticket.entries[0].swimmingPoolId).toBe(
			process.env.ticketAllowedSwimmingPoolId
		)

		expect(ticket.remainingEntries).toBe(prevTicket.remainingEntries - 1)

		jest.useRealTimers()
	})

	it('Check-in does NOT decrement remaining entries', async () => {
		const prevTicket = (await TicketModel.findByPk(
			process.env.ticketId
		)) as TicketModel

		jest.useFakeTimers('modern')
		jest.setSystemTime(new Date('2021-05-03 14:35'))
		const response = await request
			.post(endpoint(process.env.ticketAllowedSwimmingPoolId))
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${process.env.jwtOperator}`)
		expect(response.status).toBe(200)
		expect(response.body.status).toBe(CHECK_STATUS.OK)

		const ticket = (await TicketModel.findByPk(
			process.env.ticketId
		)) as TicketModel

		expect(ticket.remainingEntries).toBe(prevTicket.remainingEntries)

		jest.useRealTimers()
	})

	it('Check-in NOT OK', async () => {
		jest.useFakeTimers('modern')
		jest.setSystemTime(new Date('2021-05-03 20:19:35'))
		const response = await request
			.post(endpoint(disallowedSwimmingPool, process.env.ticket2Id))
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${process.env.jwtOperator}`)
		expect(response.status).toBe(200)

		expect(response.body.messages).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					code: TICKET_CHECKIN_ERROR_CODE.ORDER_NOT_PAID,
					optionalCheck: false,
				}),
			])
		)
		expect(response.body.messages).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					code: TICKET_CHECKIN_ERROR_CODE.FORBIDDEN_SWIMMING_POOL,
					optionalCheck: false,
				}),
			])
		)
		expect(response.body.messages).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					code: TICKET_CHECKIN_ERROR_CODE.NOT_BETWEEN_VALID_DATES,
					optionalCheck: false,
				}),
			])
		)
		expect(response.body.messages).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					code: TICKET_CHECKIN_ERROR_CODE.CUSTOMER_ALREADY_CHECK_IN,
					optionalCheck: true,
				}),
			])
		)
		expect(response.body.messages).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					code: TICKET_CHECKIN_ERROR_CODE.FORBIDDEN_ENTRY_TIME,
					optionalCheck: false,
				}),
			])
		)
		expect(response.body.messages).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					code: TICKET_CHECKIN_ERROR_CODE.TICKET_DURATION_EXPIRED,
					optionalCheck: false,
				}),
			])
		)
		expect(response.body.messages).not.toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					code: TICKET_CHECKIN_ERROR_CODE.NOT_ENOUGH_REMAINING_ENTRIES,
				}),
			])
		)
		expect(response.body.status).toBe(CHECK_STATUS.NOK)

		jest.useRealTimers()
	})
})
