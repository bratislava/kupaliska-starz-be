import supertest from 'supertest'
import Joi from 'joi'
import app from '../../../../../src/app'
import { SwimmingPoolModel } from '../../../../../src/db/models/swimmingPool'
import { createSwimmingPool } from '../../../../../src/db/factories/swimmingPool'

const endpoint = '/api/admin/swimmingPools'

const schema = Joi.object().keys({
	swimmingPools: Joi.array().items(Joi.object()).min(1).required(),
	pagination: Joi.object().keys({
		limit: Joi.number().integer().required(),
		page: Joi.number().integer().required(),
		totalPages: Joi.number().integer().required(),
		totalCount: Joi.number().integer().required()
	}).required()
})

describe(`[GET] ${endpoint})`, () => {

	beforeAll(async () => {
		await SwimmingPoolModel.bulkCreate([
			createSwimmingPool()
		])
	})

	const request = supertest(app)

	it('Expect status 401 | Invalid or missing auth token', async () => {
		const response = await request.get(endpoint)
			.set('Content-Type', 'application/json')
		expect(response.status).toBe(401)
	})

	it('Expect status 403 | Unathorized (Base user)', async () => {
		const response = await request.get(endpoint)
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${process.env.jwtBase}`)
		expect(response.status).toBe(403)
	})

	it('Expect status 403 | Unathorized (Swimming operator)', async () => {
		const response = await request.get(endpoint)
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${process.env.jwtSwimmingPoolOperator}`)
		expect(response.status).toBe(403)

	})

	it('Expect status 403 | Unathorized (Swimming employee)', async () => {
		const response = await request.get(endpoint)
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${process.env.jwtSwimmingPoolEmployee}`)
		expect(response.status).toBe(403)
	})

	it('Response should return code 200', async () => {
		const response = await request.get(endpoint)
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${process.env.jwtOperator}`)
		expect(response.status).toBe(200)
		expect(response.type).toBe('application/json')
		expect(schema.validate(response.body).error).toBeUndefined()
	})
})
