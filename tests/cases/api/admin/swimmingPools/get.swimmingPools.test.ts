import supertest from 'supertest'
import Joi from 'joi'
import app from '../../../../../src/app'
import { SwimmingPoolModel } from '../../../../../src/db/models/swimmingPool'
import { createSwimmingPool } from '../../../../../src/db/factories/swimmingPool'
import { SwimmingPoolUserModel } from '../../../../../src/db/models/swimmingPoolUser'
import { v4 as uuidv4 } from 'uuid'

const endpoint = '/api/admin/swimmingPools'

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

const swimmingPoolId = uuidv4()
const swimmingPool2Id = uuidv4()

describe(`[GET] ${endpoint})`, () => {
	beforeAll(async () => {
		await SwimmingPoolModel.bulkCreate([
			createSwimmingPool(),
			createSwimmingPool(swimmingPoolId),
			createSwimmingPool(swimmingPool2Id),
		])

		await SwimmingPoolUserModel.bulkCreate([
			{
				swimmingPoolId: swimmingPoolId,
				userId: process.env.swimmingPoolOperatorId,
			},
			{
				swimmingPoolId: swimmingPool2Id,
				userId: process.env.swimmingPoolOperatorId,
			},
		])
	})

	const request = supertest(app)

	it('Expect status 401 | Invalid or missing auth token', async () => {
		const response = await request
			.get(endpoint)
			.set('Content-Type', 'application/json')
		expect(response.status).toBe(401)
	})

	it('Expect status 403 | Unathorized (Base user)', async () => {
		const response = await request
			.get(endpoint)
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${process.env.jwtBase}`)
		expect(response.status).toBe(403)
	})

	it('Expect status 403 | Unathorized (Swimming employee)', async () => {
		const response = await request
			.get(endpoint)
			.set('Content-Type', 'application/json')
			.set(
				'Authorization',
				`Bearer ${process.env.jwtSwimmingPoolEmployee}`
			)
		expect(response.status).toBe(403)
	})

	it('Response should return code 200', async () => {
		const response = await request
			.get(endpoint)
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${process.env.jwtOperator}`)
		expect(response.status).toBe(200)
		expect(response.type).toBe('application/json')
		expect(schema.validate(response.body).error).toBeUndefined()
		expect(response.body.swimmingPools.length).toBeGreaterThan(2)
	})

	it('Swimming operator gets only his swimming pools', async () => {
		const response = await request
			.get(endpoint)
			.set('Content-Type', 'application/json')
			.set(
				'Authorization',
				`Bearer ${process.env.jwtSwimmingPoolOperator}`
			)
		expect(response.status).toBe(200)
		expect(response.body.swimmingPools.length).toBe(2)

		expect(response.body.swimmingPools).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ id: swimmingPoolId }),
			])
		)
		expect(response.body.swimmingPools).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ id: swimmingPool2Id }),
			])
		)
	})
})
