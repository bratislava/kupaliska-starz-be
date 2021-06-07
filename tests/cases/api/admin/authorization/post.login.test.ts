import supertest from 'supertest'
import Joi from 'joi'
import app from '../../../../../src/app'
import { MESSAGE_TYPES } from '../../../../../src/utils/enums'

const endpoint = '/api/admin/authorization/login'

const schema = Joi.object().keys({
	data: Joi.object().keys({
		accessToken: Joi.string().required(),
		profile: Joi.object().keys({
			id: Joi.string().guid({ version: ['uuidv4'] }).required(),
			name: Joi.string().required(),
			role: Joi.string().required(),
			email: Joi.string().required(),
			lastLoginAt: Joi.string().required(),
			swimmingPools: Joi.array()
		})
	}),
	messages: Joi.array().items(Joi.object().keys({
		message: Joi.string().invalid('_NEPRELOZENE_'),
		type: Joi.string().valid(...MESSAGE_TYPES),
		path: Joi.string()
	}))
})

describe(`[POST] ${endpoint})`, () => {
	const request = supertest(app)


	it('Expect status 401 | Unauthorized', async () => {
		const response = await request.post(endpoint)
			.set('Content-Type', 'application/json')
			.send({
				email: 'admin@amcef.com',
				password: "amcefPass13",
			})
		expect(response.status).toBe(401)
	})

	it('Response should return status code 200', async () => {
		const response = await request.post(endpoint)
			.set('Content-Type', 'application/json')
			.send({
				email: 'admin@amcef.com',
				password: "amcefPass132",
			})

		expect(response.type).toBe('application/json')
		expect(response.status).toBe(200)
		expect(schema.validate(response.body).error).toBeUndefined()
	})

})
