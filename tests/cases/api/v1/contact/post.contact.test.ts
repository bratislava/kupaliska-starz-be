import supertest from 'supertest'
import Joi from 'joi'
import app from '../../../../../src/app'
import { MESSAGE_TYPES } from '../../../../../src/utils/enums'
import faker from 'faker'

const endpoint = '/api/v1/contact'

const schema = Joi.object().keys({
	data: Joi.object(),
	messages: Joi.array().items(
		Joi.object().keys({
			message: Joi.string().invalid('_NEPRELOZENE_'),
			type: Joi.string().valid(...MESSAGE_TYPES),
			path: Joi.string(),
		})
	),
})

describe(`[POST] ${endpoint})`, () => {
	const request = supertest(app)

	it('Response should return code 200', async () => {
		const response = await request
			.post(endpoint)
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${process.env.jwtOperator}`)
			.send({
				name: 'Test Test',
				email: faker.internet.email(),
				message: faker.lorem.text(),
				agreement: true,
				token: 'Recaptcha',
			})

		expect(response.status).toBe(200)
		expect(response.type).toBe('application/json')
		expect(schema.validate(response.body).error).toBeUndefined()
	})

	it('Agreement must be true and recaptcha is required', async () => {
		const response = await request
			.post(endpoint)
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${process.env.jwtOperator}`)
			.send({
				name: 'Test Test',
				email: faker.internet.email(),
				message: faker.lorem.text(),
				agreement: false,
			})

		expect(response.status).toBe(400)
		expect(response.body.messages).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ path: 'body.agreement' }),
			])
		)
		expect(response.body.messages).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ path: 'body.recaptcha' }),
			])
		)
	})
})
