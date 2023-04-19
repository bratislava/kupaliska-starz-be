import supertest from 'supertest'
import Joi from 'joi'
import app from '../../../../../src/app'
import { MESSAGE_TYPES } from '../../../../../src/utils/enums'
import { UserModel } from '../../../../../src/db/models/user'
import { comparePassword } from '../../../../../src/utils/authorization'
import each from 'jest-each'

const endpoint = () => `/api/v1/users/resetPassword`

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

describe(`[PUT] RESET PASSWORD - ${endpoint})`, () => {
	const request = supertest(app)

	it('Expect status 401 | Invalid or missing token', async () => {
		const response = await request
			.put(endpoint())
			.set('Content-Type', 'application/json')
		expect(response.status).toBe(401)
	})

	it('Expect status 400 | wrong password confirmation', async () => {
		const response = await request
			.put(endpoint())
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${process.env.jwtResetPassword}`)
			.send({
				password: 'secretNew2x',
				passwordConfirmation: 'secretNew2',
			})

		expect(response.status).toBe(400)
		expect(response.body.messages[0].path).toBe('body.passwordConfirmation')
	})

	it('Response should return code 200', async () => {
		const response = await request
			.put(endpoint())
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${process.env.jwtResetPassword}`)
			.send({
				password: 'secretNew2',
				passwordConfirmation: 'secretNew2',
			})
		expect(response.status).toBe(200)
		expect(response.type).toBe('application/json')
		expect(schema.validate(response.body).error).toBeUndefined()

		const user = await UserModel.findByPk(
			process.env.jwtResetPasswordUserId
		)
		expect(await comparePassword('secretNew2', user.hash)).toBeTruthy()
	})

	each([['secretNew'], ['secretx'], ['secretx1'], ['11111111']]).it(
		'Weak password',
		async (password: string) => {
			const response = await request
				.put(endpoint())
				.set('Content-Type', 'application/json')
				.set('Authorization', `Bearer ${process.env.jwtResetPassword}`)
				.send({
					password: password,
					passwordConfirmation: password,
				})
			expect(response.status).toBe(400)
			expect(response.body.messages[0].path).toBe('body.password')
		}
	)
})
