import supertest from 'supertest'
import Joi from 'joi'
import app from '../../../../../src/app'

const endpoint = (id = 'c70954c7-970d-4f1a-acf4-12b91acabe02') => `/api/v1/ticketTypes/${id}`

const schema = Joi.object().keys()

describe(`[GET] ${endpoint})`, () => {
	const request = supertest(app)

	it('Response should return code 200', async () => {
		const response = await request.get(endpoint())
			.set('Content-Type', 'application/json')
		expect(response.status).toBe(200)
		expect(response.type).toBe('application/json')
		expect(schema.validate(response.body).error).toBeUndefined()
	})
})
