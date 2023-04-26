import supertest from 'supertest'
import Joi from 'joi'
import app from '../../../../../src/app'
import { v4 as uuidv4 } from 'uuid'
import { SwimmingPoolModel } from '../../../../../src/db/models/swimmingPool'
import { createSwimmingPool } from '../../../../../src/db/factories/swimmingPool'
import { SwimmingPoolUserModel } from '../../../../../src/db/models/swimmingPoolUser'

const endpoint = (id = swimmingPoolId) => `/api/admin/swimmingPools/${id}`

const schema = Joi.object().keys()
const swimmingPoolId = uuidv4()
const swimmingPool2Id = uuidv4()

describe(`[GET] ${endpoint})`, () => {
	beforeAll(async () => {
		await SwimmingPoolModel.bulkCreate([
			createSwimmingPool(swimmingPoolId),
			createSwimmingPool(swimmingPool2Id),
		])

		await SwimmingPoolUserModel.create({
			swimmingPoolId: swimmingPoolId,
			userId: process.env.swimmingPoolOperatorId,
		})
	})

	const request = supertest(app)

	it('Expect status 401 | Invalid or missing auth token', async () => {
		const response = await request
			.get(endpoint())
			.set('Content-Type', 'application/json')
		expect(response.status).toBe(401)
	})

	it('Expect status 403 | Unathorized (Base user)', async () => {
		const response = await request
			.get(endpoint())
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${process.env.jwtBase}`)
		expect(response.status).toBe(403)
	})

	it('Expect status 403 | Unathorized (Swimming employee)', async () => {
		const response = await request
			.get(endpoint())
			.set('Content-Type', 'application/json')
			.set(
				'Authorization',
				`Bearer ${process.env.jwtSwimmingPoolEmployee}`
			)
		expect(response.status).toBe(403)
	})

	it('Expect status 404', async () => {
		const response = await request
			.get(endpoint(uuidv4()))
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${process.env.jwtOperator}`)
		expect(response.status).toBe(404)
	})

	it('Response should return code 200', async () => {
		const response = await request
			.get(endpoint())
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${process.env.jwtOperator}`)
		expect(response.status).toBe(200)
		expect(response.type).toBe('application/json')
		expect(schema.validate(response.body).error).toBeUndefined()

		expect(response.body.name).toBe('Delfin')
		expect(response.body.description).toBe('Popis kupaliska delfín.')
		expect(response.body.expandedDescription).toBe(
			'Dlhsí Popis kupaliska delfín.'
		)
		expect(response.body.waterTemp).toBe(-5)
		expect(response.body.maxCapacity).toBe(1000)
		expect(response.body.locationUrl).toBe(
			'https://goo.gl/maps/gvuMM4mYWvtGiRfN8'
		)
		expect(response.body.openingHours).toStrictEqual([
			{ startFrom: '2021-01-01', startTo: '2022-01-01' },
		])
		expect(response.body.facilities).toStrictEqual(['food', 'playground'])
	})

	it('Can get only assigned swimming pool', async () => {
		let response = await request
			.get(endpoint())
			.set('Content-Type', 'application/json')
			.set(
				'Authorization',
				`Bearer ${process.env.jwtSwimmingPoolOperator}`
			)
		expect(response.status).toBe(200)

		response = await request
			.get(endpoint(swimmingPool2Id))
			.set('Content-Type', 'application/json')
			.set(
				'Authorization',
				`Bearer ${process.env.jwtSwimmingPoolOperator}`
			)
		expect(response.status).toBe(403)
	})
})
