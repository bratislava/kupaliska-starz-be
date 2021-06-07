import { CHECK_STATUS, ENTRY_FLAG, ENTRY_TYPE, TICKET_CHECKOUT_ERROR_CODE } from './../../../../../src/utils/enums';
import supertest from 'supertest'
import Joi from 'joi'
import app from '../../../../../src/app'
import { TicketModel } from '../../../../../src/db/models/ticket';

const endpoint = (swimmingPoolId = 'c70954c7-970d-4f1a-acf4-12b91acabe01') => `/api/admin/tickets/swimmingPools/${swimmingPoolId}/checkout`

const schema = Joi.object().keys()

describe(`[POST] ${endpoint})`, () => {
	const request = supertest(app)

	it('Expect status 401 | Invalid or missing auth token', async () => {
		const response = await request.post(endpoint())
			.set('Content-Type', 'application/json')
		expect(response.status).toBe(401)
	})

	it('Expect status 403 | Unathorized (Base user)', async () => {
		const response = await request.post(endpoint())
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${process.env.jwtBase}`)
			.set('Qr-Code-Authorization', `${process.env.jwtTicket}`)
		expect(response.status).toBe(403)
	})

	it('Expect status 401 | Invalid or missing jwt qr code', async () => {
		const response = await request.post(endpoint())
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${process.env.jwtOperator}`)
		expect(response.status).toBe(404)
	})

	it('Check-out create new entry', async () => {
		jest.useFakeTimers('modern')
		jest.setSystemTime(new Date('2021-05-03 14:35'));
		const response = await request.post(endpoint(process.env.ticketAllowedSwimmingPoolId))
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${process.env.jwtOperator}`)
			.set('Qr-Code-Authorization', `${process.env.jwtTicket}`)
		expect(response.status).toBe(200)
		expect(response.body.status).toBe(CHECK_STATUS.OK)

		const ticket = await TicketModel.findByPk(process.env.ticketId, {
			include: {
				association: 'entries',
				separate: true,
				order: [['timestamp', 'desc']],
				limit: 1
			}
		})

		expect(ticket.entries[0]).toBeTruthy()
		expect(ticket.entries[0].type).toBe(ENTRY_TYPE.CHECKOUT)
		expect(ticket.entries[0].flag).toBe(ENTRY_FLAG.MANUAL)
		expect(ticket.entries[0].employeeId).toBe(process.env.operatorId)
		expect(ticket.entries[0].swimmingPoolId).toBe(process.env.ticketAllowedSwimmingPoolId)

		jest.useRealTimers();
	})

	it('Check-in OK with warnings', async () => {

		jest.useFakeTimers('modern')
		jest.setSystemTime(new Date('2021-05-03 20:19:35'));
		const response = await request.post(endpoint())
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${process.env.jwtOperator}`)
			.set('Qr-Code-Authorization', `${process.env.jwtTicket2}`)
		expect(response.status).toBe(200)

		expect(response.body.messages).toEqual(expect.arrayContaining([expect.objectContaining(
			{ code: TICKET_CHECKOUT_ERROR_CODE.CHECKOUT_AFTER_ALLOWED_TIME, optionalCheck: true })]))
		expect(response.body.messages).toEqual(expect.arrayContaining([expect.objectContaining(
			{ code: TICKET_CHECKOUT_ERROR_CODE.CHECKOUT_TICKET_DURATION_EXPIRED, optionalCheck: true })]))
		expect(response.body.messages).toEqual(expect.arrayContaining([expect.objectContaining(
			{ code: TICKET_CHECKOUT_ERROR_CODE.FORBIDDEN_SWIMMING_POOL, optionalCheck: true })]))
		expect(response.body.messages).not.toEqual(expect.arrayContaining([expect.objectContaining(
			{ code: TICKET_CHECKOUT_ERROR_CODE.CUSTOMER_DID_NOT_CHECK_IN })]))
		expect(response.body.status).toBe(CHECK_STATUS.OK)

		jest.useRealTimers();
	})

})
