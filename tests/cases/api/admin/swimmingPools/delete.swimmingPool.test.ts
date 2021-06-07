import supertest from 'supertest'
import Joi from 'joi'
import app from '../../../../../src/app'
import { v4 as uuidv4 } from 'uuid';
import { SwimmingPoolModel } from '../../../../../src/db/models/swimmingPool';
import { createSwimmingPool } from '../../../../../src/db/factories/swimmingPool';
import { SwimmingPoolUserModel } from '../../../../../src/db/models/swimmingPoolUser';
import { MESSAGE_TYPE } from '../../../../../src/utils/enums';

const endpoint = (id = swimmingPoolId) => `/api/admin/swimmingPools/${id}`

const schema = Joi.object().keys()

const schemaNotFound = Joi.object().keys({
	messages: Joi.array().items(Joi.object().keys({
		message: Joi.string().invalid('_NEPRELOZENE_'),
		type: Joi.string().valid(MESSAGE_TYPE.ERROR)
	}))
})

const swimmingPoolId = uuidv4()

describe(`[DELETE] ${endpoint})`, () => {

	beforeAll(async () => {
		await SwimmingPoolModel.bulkCreate([
			createSwimmingPool(swimmingPoolId)
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

	it('Expect status 403 | Unathorized (Swimming employee)', async () => {
		const response = await request.delete(endpoint())
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${process.env.jwtSwimmingPoolEmployee}`)
		expect(response.status).toBe(403)
	})

	it('Expect status 403 | Unathorized (Swimming operator)', async () => {
		const response = await request.delete(endpoint())
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${process.env.jwtSwimmingPoolOperator}`)
		expect(response.status).toBe(403)
	})

	it('Response should return code 200', async () => {
		const response = await request.delete(endpoint())
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${process.env.jwtOperator}`)
		expect(response.status).toBe(200)
		expect(response.type).toBe('application/json')
		expect(schema.validate(response.body).error).toBeUndefined()

		const swimmingPool = await SwimmingPoolModel.findByPk(swimmingPoolId, { paranoid: false})
		expect(swimmingPool).toBeTruthy()
		expect(swimmingPool.deletedAt).not.toBeNull()
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
