import supertest from 'supertest'
import app from '../../../../../src/app'
import config from 'config'
import { v4 as uuidv4 } from 'uuid'
import { IPassportConfig } from '../../../../../src/types/interfaces'
import { createJwt } from '../../../../../src/utils/authorization'
import { OrderModel } from '../../../../../src/db/models/order'
import { createOrder } from '../../../../../src/db/factories/order'
import { createTicket } from '../../../../../src/db/factories/ticket'
import { createProfile } from '../../../../../src/db/factories/profile'
import { createTicketType } from '../../../../../src/db/factories/ticketType'
const passportConfig: IPassportConfig = config.get('passport')

const endpoint = (id = orderId) => `/api/v1/orders/${id}/successful`
const orderId = uuidv4()
let jwtOrder: string

describe(`[GET] ${endpoint})`, () => {
	const request = supertest(app)

	beforeAll(async () => {
		jwtOrder = await createJwt(
			{ uid: orderId },
			{ audience: passportConfig.jwt.orderResponse.audience }
		)

		await OrderModel.bulkCreate(
			[
				{
					...createOrder(orderId),
					tickets: [
						{
							...createTicket(),
							profile: createProfile(),
							ticketType: createTicketType(),
						},
					],
				},
			],
			{
				include: [
					{ association: 'paymentOrder' },
					{
						association: 'tickets',
						include: [
							{ association: 'profile' },
							{ association: 'ticketType' },
						],
					},
				],
			}
		)
	})

	it('Expect status 401 | Invalid or missing order token', async () => {
		const response = await request
			.get(endpoint())
			.set('Content-Type', 'application/json')
		expect(response.status).toBe(401)
	})

	it('Order not found', async () => {
		const response = await request
			.get(`${endpoint(uuidv4())}`)
			.set('Content-Type', 'application/json')
			.set('Order-Authorization', `${jwtOrder}`)
			.send()
		expect(response.status).toBe(404)
	})

	it('Response hould return 200 ', async () => {
		const response = await request
			.get(`${endpoint()}`)
			.set('Content-Type', 'application/json')
			.set('Order-Authorization', `${jwtOrder}`)
			.send()

		expect(response.status).toBe(200)
		expect(response.type).toBe('application/json')

		expect(response.body.tickets).toHaveLength(1)
		expect(response.body.tickets[0].qrCode).toBeTruthy()
		expect(response.body.pdf).toBeTruthy()
	})
})
