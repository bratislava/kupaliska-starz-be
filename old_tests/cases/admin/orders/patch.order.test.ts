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

const endpoint = (id = orderId) => `/api/admin/orders/${id}`

const schema = Joi.object().keys({
	data: Joi.object(),
	messages: Joi.array().items(Joi.object().keys({
		message: Joi.string().invalid('_NEPRELOZENE_'),
		type: Joi.string().valid(...MESSAGE_TYPES),
		path: Joi.string()
	}))
})

const orderId = uuidv4()

describe(`[PATCH] ${endpoint})`, () => {
	const request = supertest(app)

	beforeAll(async () => {
		await OrderModel.bulkCreate([
			{
				...createOrder(orderId),
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
		const response = await request.patch(endpoint())
			.set('Content-Type', 'application/json')
		expect(response.status).toBe(401)
	})

	it('Expect status 403 | Unathorized (Base user)', async () => {
		const response = await request.patch(endpoint())
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${process.env.jwtBase}`)
		expect(response.status).toBe(403)
	})

	it('Expect status 403 | Unathorized (Swimming employee)', async () => {
		const response = await request.patch(endpoint())
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${process.env.jwtSwimmingPoolEmployee}`)
		expect(response.status).toBe(403)
	})


	it('Response should return code 200', async () => {

		const email = faker.internet.email()
		const response = await request.patch(endpoint())
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${process.env.jwtOperator}`)
			.send({
				state: ORDER_STATE.CANCELED,
				email: email,
				orderNumber:101
			})
		expect(response.status).toBe(200)
		expect(response.type).toBe('application/json')
		expect(schema.validate(response.body).error).toBeUndefined()

		expect(response.body.data.order.state).toBe(ORDER_STATE.CANCELED)
		expect(response.body.data.order.email).toBe(email)
		expect(response.body.data.order.orderNumber).toBe(101)
	})
})
