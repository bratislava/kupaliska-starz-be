import supertest from 'supertest'
import Joi from 'joi'
import app from '../../../../../src/app'
import { MESSAGE_TYPES } from '../../../../../src/utils/enums'
import { UserModel } from '../../../../../src/db/models/user'
import { comparePassword } from '../../../../../src/utils/authorization'

const endpoint = () => `/api/v1/users/changePassword`


const schema = Joi.object().keys({
	data: Joi.object().keys({
		id: Joi.string().guid({ version: ['uuidv4'] }),
		accessToken: Joi.string().required()
	}),
	messages: Joi.array().items(Joi.object().keys({
		message: Joi.string().invalid('_NEPRELOZENE_'),
		type: Joi.string().valid(...MESSAGE_TYPES),
		path: Joi.string()
	}))
})

describe(`[PUT] CHANGE PASSWORD - ${endpoint})`, () => {
	const request = supertest(app)

	it('Expect status 401 | Invalid or missing auth token', async () => {
		const response = await request.put(endpoint())
			.set('Content-Type', 'application/json')
		expect(response.status).toBe(401)
	})

	it('Expect status 400 | wrong old password', async () => {
		const response = await request.put(endpoint())
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${process.env.jwtBase}`)
			.send({
				oldPassword: 'amcefPass13',
				password: 'newPass132',
				passwordConfirmation: 'newPass132',
			})

		expect(response.status).toBe(400)
		expect(response.body.messages[0].path).toBe('incorrectPassword')

	})

	it('Expect status 400 | wrong password confirmation', async () => {
		const response = await request.put(endpoint())
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${process.env.jwtBase}`)
			.send({
				oldPassword: 'amcefPass132',
				password: 'newPass132',
				passwordConfirmation: 'newPass13',
			})

		expect(response.status).toBe(400)
		expect(response.body.messages[0].path).toBe('body.passwordConfirmation')

	})

	it('Response should return code 200', async () => {
		const response = await request.put(endpoint())
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${process.env.jwtBase}`)
			.send({
				oldPassword: 'amcefPass132',
				password: 'newPass132',
				passwordConfirmation: 'newPass132',
			})
		expect(response.status).toBe(200)
		expect(response.type).toBe('application/json')
		expect(schema.validate(response.body).error).toBeUndefined()

		const user = await UserModel.findByPk(response.body.data.id)
		expect(await comparePassword('newPass132', user.hash)).toBeTruthy()
	})

})
