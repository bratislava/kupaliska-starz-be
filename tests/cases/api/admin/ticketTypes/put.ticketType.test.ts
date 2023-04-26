import supertest from 'supertest'
import Joi from 'joi'
import app from '../../../../../src/app'
import { MESSAGE_TYPES } from '../../../../../src/utils/enums'
import { UserModel } from '../../../../../src/db/models/user'
import { TicketTypeModel } from '../../../../../src/db/models/ticketType'
import { createTicketType } from '../../../../../src/db/factories/ticketType'
import { v4 as uuidv4 } from 'uuid'

const endpoint = (id = ticketTypeId) => `/api/admin/ticketTypes/${id}`

const schema = Joi.object().keys({
	data: Joi.object().keys({
		id: Joi.string().guid({ version: ['uuidv4'] }),
		ticketType: Joi.object(),
	}),
	messages: Joi.array().items(
		Joi.object().keys({
			message: Joi.string().invalid('_NEPRELOZENE_'),
			type: Joi.string().valid(...MESSAGE_TYPES),
			path: Joi.string(),
		})
	),
})

const ticketTypeId = uuidv4()

describe(`[PUT] ${endpoint})`, () => {
	beforeAll(async () => {
		await TicketTypeModel.bulkCreate([createTicketType(ticketTypeId)])
	})

	const request = supertest(app)

	it('Expect status 401 | Invalid or missing auth token', async () => {
		const response = await request
			.put(endpoint())
			.set('Content-Type', 'application/json')
		expect(response.status).toBe(401)
	})

	it('Expect status 403 | Unathorized (Base user)', async () => {
		const response = await request
			.put(endpoint())
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${process.env.jwtBase}`)
		expect(response.status).toBe(403)
	})

	it('Expect status 403 | Unathorized (Swimming operator)', async () => {
		const response = await request
			.put(endpoint())
			.set('Content-Type', 'application/json')
			.set(
				'Authorization',
				`Bearer ${process.env.jwtSwimmingPoolOperator}`
			)
		expect(response.status).toBe(403)
	})

	it('Expect status 403 | Unathorized (Swimming employee)', async () => {
		const response = await request
			.put(endpoint())
			.set('Content-Type', 'application/json')
			.set(
				'Authorization',
				`Bearer ${process.env.jwtSwimmingPoolEmployee}`
			)
		expect(response.status).toBe(403)
	})

	it('Response should return code 200', async () => {
		const response = await request
			.put(endpoint())
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${process.env.jwtOperator}`)
			.send({
				name: 'Novy nazov',
				description: 'Novy popis',
				price: 100.23,
				nameRequired: false,
				photoRequired: false,
				validFrom: '2021-09-12',
				validTo: '2021-10-12',
				swimmingPools: ['c70954c7-970d-4f1a-acf4-12b91acabe01'],
			})
		expect(response.status).toBe(200)
		expect(response.type).toBe('application/json')
		expect(schema.validate(response.body).error).toBeUndefined()

		const ticketType = await TicketTypeModel.findByPk(response.body.data.id)
		expect(ticketType.name).toBe('Novy nazov')
		expect(ticketType.description).toBe('Novy popis')
		expect(ticketType.price).toBe(100.23)
		expect(ticketType.nameRequired).toBe(false)
		expect(ticketType.photoRequired).toBe(false)
		expect(ticketType.validFrom).toBe('2021-09-12')
		expect(ticketType.validTo).toBe('2021-10-12')
		expect(response.body.data.ticketType.swimmingPools).toStrictEqual([
			{ id: 'c70954c7-970d-4f1a-acf4-12b91acabe01', name: 'Delfín' },
		])
	})
})
