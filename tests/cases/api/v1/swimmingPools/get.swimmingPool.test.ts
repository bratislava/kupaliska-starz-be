import supertest from 'supertest'
import Joi from 'joi'
import app from '../../../../../src/app'
import { SwimmingPoolModel } from '../../../../../src/db/models/swimmingPool'
import { createSwimmingPool } from '../../../../../src/db/factories/swimmingPool'
import { v4 as uuidv4 } from 'uuid'

const endpoint = (id = swimmingPoolId) => `/api/v1/swimmingPools/${id}`

const schema = Joi.object().keys()
const swimmingPoolId = uuidv4()

describe(`[GET] ${endpoint})`, () => {
	beforeAll(async () => {
		await SwimmingPoolModel.bulkCreate([createSwimmingPool(swimmingPoolId)])
	})

	const request = supertest(app)

	it('Response should return code 200', async () => {
		const response = await request
			.get(endpoint())
			.set('Content-Type', 'application/json')
		expect(response.status).toBe(200)
		expect(response.type).toBe('application/json')
		expect(schema.validate(response.body).error).toBeUndefined()
	})
})
