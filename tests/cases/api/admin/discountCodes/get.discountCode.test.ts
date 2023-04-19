import { createDiscountCode } from '../../../../../src/db/factories/discountCode'
import supertest from 'supertest'
import Joi from 'joi'
import app from '../../../../../src/app'
import { v4 as uuidv4 } from 'uuid'
import { DiscountCodeModel } from '../../../../../src/db/models/discountCode'

const endpoint = (id = discountCodeId) => `/api/admin/discountCodes/${id}`

const schema = Joi.object().keys()
const discountCodeId = uuidv4()

describe(`[GET] ${endpoint})`, () => {
	beforeAll(async () => {
		await DiscountCodeModel.bulkCreate([createDiscountCode(discountCodeId)])
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

	it('Expect status 403 | Unathorized (Swimming operator)', async () => {
		const response = await request
			.get(endpoint())
			.set('Content-Type', 'application/json')
			.set(
				'Authorization',
				`Bearer ${process.env.jwtSwimmingPoolOperator}`
			)
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

	it('Expect status 403 | Unathorized (Operator)', async () => {
		const response = await request
			.get(endpoint())
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${process.env.jwtOperator}`)
		expect(response.status).toBe(403)
	})

	it('Response should return code 200', async () => {
		const response = await request
			.get(endpoint())
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${process.env.jwtSuperAdmin}`)
		expect(response.status).toBe(200)
		expect(response.type).toBe('application/json')
		expect(schema.validate(response.body).error).toBeUndefined()
	})
})
