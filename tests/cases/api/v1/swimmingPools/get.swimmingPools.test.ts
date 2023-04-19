import supertest from 'supertest'
import Joi from 'joi'
import app from '../../../../../src/app'
import { SwimmingPoolModel } from '../../../../../src/db/models/swimmingPool'
import { createSwimmingPool } from '../../../../../src/db/factories/swimmingPool'

const endpoint = '/api/v1/swimmingPools'

const schema = Joi.object().keys({
	swimmingPools: Joi.array().items(Joi.object()).min(1).required(),
	pagination: Joi.object()
		.keys({
			limit: Joi.number().integer().required(),
			page: Joi.number().integer().required(),
			totalPages: Joi.number().integer().required(),
			totalCount: Joi.number().integer().required(),
		})
		.required(),
})

describe(`[GET] ${endpoint})`, () => {
	beforeAll(async () => {
		await SwimmingPoolModel.bulkCreate([createSwimmingPool()])
	})

	const request = supertest(app)

	it('Response should return code 200', async () => {
		const response = await request
			.get(endpoint)
			.set('Content-Type', 'application/json')
		expect(response.status).toBe(200)
		expect(response.type).toBe('application/json')
		expect(schema.validate(response.body).error).toBeUndefined()
	})
})
