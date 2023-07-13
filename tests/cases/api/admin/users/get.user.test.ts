import supertest from 'supertest'
import Joi from 'joi'
import app from '../../../../../src/app'
import { USER_ROLES } from '../../../../../src/utils/enums'

const endpoint = (id = process.env.operatorId) => `/api/admin/users/${id}`

const schema = Joi.object().keys({
	id: Joi.string()
		.guid({ version: ['uuidv4'] })
		.required(),
	name: Joi.string().max(255).required(),
	email: Joi.string().max(255).required(),
	isConfirmed: Joi.boolean().required(),
	role: Joi.string()
		.uppercase()
		.valid(...USER_ROLES)
		.required(),
	swimmingPools: Joi.array().items(Joi.string()),
	createdAt: Joi.string().isoDate().required(),
	updatedAt: Joi.string().isoDate().required(),
	deletedAt: Joi.string().isoDate().required().allow(null),
})

describe(`[GET] ${endpoint})`, () => {
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

	it('Response should return code 200', async () => {
		const response = await request
			.get(endpoint())
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${process.env.jwtOperator}`)
		expect(response.status).toBe(200)
		expect(response.type).toBe('application/json')
		expect(schema.validate(response.body).error).toBeUndefined()
	})
})
