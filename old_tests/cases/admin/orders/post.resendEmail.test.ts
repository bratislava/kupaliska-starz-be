import { createProfile } from './../../../../../src/db/factories/profile';
import { createTicket } from './../../../../../src/db/factories/ticket';
import { createOrder } from './../../../../../src/db/factories/order';
import supertest from 'supertest'
import Joi from 'joi'
import app from '../../../../../src/app'
import { MESSAGE_TYPES, ORDER_STATE } from '../../../../../src/utils/enums'
import { v4 as uuidv4 } from 'uuid';
import { OrderModel } from '../../../../../src/db/models/order';
import faker from 'faker';
import { createTicketType } from '../../../../../src/db/factories/ticketType';

const endpoint = (id = orderId) => `/api/admin/orders/${id}/resend`

const schema = Joi.object().keys({
	data: Joi.object(),
	messages: Joi.array().items(Joi.object().keys({
		message: Joi.string().invalid('_NEPRELOZENE_'),
		type: Joi.string().valid(...MESSAGE_TYPES),
		path: Joi.string()
	}))
})

const orderId = uuidv4()
const order2Id = uuidv4()

describe(`[POST] ${endpoint})`, () => {
	const request = supertest(app)

	beforeAll(async () => {
		await OrderModel.bulkCreate([
			{
				...createOrder(orderId),
				state: ORDER_STATE.PAID,
				tickets: [{
					...createTicket(),
					profile: createProfile(),
					ticketType: createTicketType()
				}]
			},
			{
				...createOrder(order2Id),
				tickets: [{
					...createTicket(),
					profile: createProfile(),
					ticketType: createTicketType()
				}]
			}
		], {
			include: [
				{ association: 'paymentOrder' },
				{
					association: 'tickets',
					include: [
						{ association: 'profile' },
						{ association: 'ticketType' },
					]
				},
			]
		})

	})

	it('Expect status 401 | Invalid or missing auth token', async () => {
		const response = await request.post(endpoint())
			.set('Content-Type', 'application/json')
		expect(response.status).toBe(401)
	})

	it('Expect status 403 | Unathorized (Base user)', async () => {
		const response = await request.post(endpoint())
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${process.env.jwtBase}`)
		expect(response.status).toBe(403)
	})

	it('Expect status 403 | Unathorized (Swimming employee)', async () => {
		const response = await request.post(endpoint())
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${process.env.jwtSwimmingPoolEmployee}`)
		expect(response.status).toBe(403)
	})


	it('Response should return code 200', async () => {

		const email = faker.internet.email()
		const response = await request.post(endpoint())
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${process.env.jwtOperator}`)
			.send()
		expect(response.status).toBe(200)
		expect(response.type).toBe('application/json')
		expect(schema.validate(response.body).error).toBeUndefined()
	})

	it('Should return 404 | Order must be paid', async () => {

		const email = faker.internet.email()
		const response = await request.post(endpoint(order2Id))
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${process.env.jwtOperator}`)
			.send()
		expect(response.status).toBe(404)
	})
})
