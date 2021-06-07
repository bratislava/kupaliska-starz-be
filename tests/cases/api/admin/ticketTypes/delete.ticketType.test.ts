import supertest from 'supertest'
import Joi from 'joi'
import app from '../../../../../src/app'
import { MESSAGE_TYPE, MESSAGE_TYPES } from '../../../../../src/utils/enums'
import { TicketTypeModel } from '../../../../../src/db/models/ticketType'
import { createTicketType } from '../../../../../src/db/factories/ticketType'
import { v4 as uuidv4 } from 'uuid';

const endpoint = (id = ticketTypeId) => `/api/admin/ticketTypes/${id}`

const schema = Joi.object().keys({
	data: Joi.object().keys({
		id: Joi.string().guid({version: ['uuidv4']})
	}),
	messages: Joi.array().items(Joi.object().keys({
		message: Joi.string().invalid('_NEPRELOZENE_'),
		type: Joi.string().valid(...MESSAGE_TYPES)
	}))
})

const schemaNotFound = Joi.object().keys({
	messages: Joi.array().items(Joi.object().keys({
		message: Joi.string().invalid('_NEPRELOZENE_'),
		type: Joi.string().valid(MESSAGE_TYPE.ERROR)
	}))
})

const ticketTypeId = uuidv4()

describe(`[DELETE] ${endpoint})`, () => {

	beforeAll(async () => {
		await TicketTypeModel.bulkCreate([
			createTicketType(ticketTypeId)
		])
	})

	const request = supertest(app)

	it('Expect status 401 | Invalid or missing auth token', async () => {
		const response = await request.delete(endpoint())
			.set('Content-Type', 'application/json')
		expect(response.status).toBe(401)
	})

	it('Expect status 403 | Unathorized (Base user)', async () => {
		const response = await request.delete(endpoint())
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${process.env.jwtBase}`)
		expect(response.status).toBe(403)
	})

	it('Expect status 403 | Unathorized (Swimming operator)', async () => {
		const response = await request.delete(endpoint())
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${process.env.jwtSwimmingPoolOperator}`)
			expect(response.status).toBe(403)

	})

	it('Expect status 403 | Unathorized (Swimming employee)', async () => {
		const response = await request.delete(endpoint())
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${process.env.jwtSwimmingPoolEmployee}`)
			expect(response.status).toBe(403)
	})

	it('Response should return code 200', async () => {
		const response = await request.delete(endpoint())
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${process.env.jwtOperator}`)
		expect(response.status).toBe(200)
		expect(response.type).toBe('application/json')
		expect(schema.validate(response.body).error).toBeUndefined()
	})

	it('Response should return code 404', async () => {
		const response = await request.delete(endpoint())
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${process.env.jwtOperator}`)
		expect(response.status).toBe(404)
		expect(response.type).toBe('application/json')
		expect(schemaNotFound.validate(response.body).error).toBeUndefined()
	})
})
