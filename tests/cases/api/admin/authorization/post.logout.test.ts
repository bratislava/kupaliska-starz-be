import config from 'config'
import { createJwt } from '../../../../../src/utils/authorization'
import { IPassportConfig } from '../../../../../src/types/interfaces'
import { UserModel } from '../../../../../src/db/models/user'

const passportConfig: IPassportConfig = config.get('passport')

import supertest from 'supertest'
import Joi from 'joi'
import app from '../../../../../src/app'
import { MESSAGE_TYPES, USER_ROLE } from '../../../../../src/utils/enums'
import { v4 as uuidv4 } from 'uuid'
import faker from 'faker'

const endpoint = '/api/admin/authorization/logout'
const userToLogout = uuidv4()

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
	beforeAll(async () => {
		await UserModel.bulkCreate([
			{
				id: userToLogout,
				email: faker.internet.email(),
				name: 'Logout test',
				role: USER_ROLE.OPERATOR,
				isConfirmed: true,
				hash: 'hashedPassword',
				issuedTokens: 2,
				tokenValidFromNumber: 0,
			},
		])
	})

	const request = supertest(app)

	it('Expect status 401 | Unauthorized', async () => {
		const response = await request
			.post(endpoint)
			.set('Content-Type', 'application/json')

		expect(response.status).toBe(401)
	})

	it('Expect status 200 | should log out from all devices', async () => {
		const jwt1 = await createJwt(
			{ uid: userToLogout, s: 1 },
			{ audience: passportConfig.jwt.user.audience }
		)
		await createJwt(
			{ uid: userToLogout, s: 2 },
			{ audience: passportConfig.jwt.user.audience }
		)

		const response = await request
			.post(endpoint)
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${jwt1}`)

		expect(response.type).toBe('application/json')
		expect(response.status).toBe(200)
		expect(schema.validate(response.body).error).toBeUndefined()

		const user = await UserModel.findByPk(userToLogout)
		expect(user.tokenValidFromNumber).toBe(3)
	})
})
