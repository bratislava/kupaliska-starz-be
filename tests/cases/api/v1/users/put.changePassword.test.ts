import supertest from 'supertest'
import Joi from 'joi'
import bcrypt from 'bcryptjs'
import * as argon2 from 'argon2'
import config from 'config'
import faker from 'faker'
import { v4 as uuidv4 } from 'uuid'
import app from '../../../../../src/app'
import { MESSAGE_TYPES, USER_ROLE } from '../../../../../src/utils/enums'
import { UserModel } from '../../../../../src/db/models/user'
import {
	comparePassword,
	comparePasswordBcrypt,
	comparePasswordPreviousPepper,
	createJwt,
} from '../../../../../src/utils/authorization'
import { IPasswordHashingConfig, IPassportConfig } from '../../../../../src/types/interfaces'

const passwordHashingConfig: IPasswordHashingConfig = config.get('passwordHashing')
const passportConfig: IPassportConfig = config.get('passport')

const endpoint = () => `/api/v1/users/changePassword`

const schema = Joi.object().keys({
	data: Joi.object().keys({
		id: Joi.string().guid({ version: ['uuidv4'] }),
		accessToken: Joi.string().required(),
	}),
	messages: Joi.array().items(
		Joi.object().keys({
			message: Joi.string().invalid('_NEPRELOZENE_'),
			type: Joi.string().valid(...MESSAGE_TYPES),
			path: Joi.string(),
		})
	),
})

describe(`[PUT] CHANGE PASSWORD - ${endpoint})`, () => {
	const request = supertest(app)

	it('Expect status 401 | Invalid or missing auth token', async () => {
		const response = await request.put(endpoint()).set('Content-Type', 'application/json')
		expect(response.status).toBe(401)
	})

	it('Expect status 400 | wrong old password', async () => {
		const response = await request
			.put(endpoint())
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
		const response = await request
			.put(endpoint())
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

	it('Should allow password change and migrate legacy bcrypt hash to argon2', async () => {
		const bcryptUserId = uuidv4()
		const bcryptUserEmail = faker.internet.email()
		const oldPassword = 'legacyBcryptPass132'

		await UserModel.bulkCreate([
			{
				id: bcryptUserId,
				email: bcryptUserEmail,
				name: 'Legacy bcrypt user',
				role: USER_ROLE.BASIC,
				isConfirmed: true,
				hash: bcrypt.hashSync(oldPassword, bcrypt.genSaltSync(12)),
				issuedTokens: 1,
				tokenValidFromNumber: 0,
			},
		])

		const jwt = await createJwt(
			{ uid: bcryptUserId, s: 1 },
			{ audience: passportConfig.jwt.user.audience }
		)

		const response = await request
			.put(endpoint())
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${jwt}`)
			.send({
				oldPassword,
				password: 'newPass132',
				passwordConfirmation: 'newPass132',
			})

		expect(response.status).toBe(200)
		expect(schema.validate(response.body).error).toBeUndefined()

		const user = (await UserModel.findByPk(bcryptUserId)) as UserModel
		expect(await comparePasswordBcrypt('newPass132', user.hash)).toBe(false)
		expect(await comparePassword('newPass132', user.hash)).toBe(true)
	})

	it('Should allow password change and migrate legacy previous-pepper hash to current pepper', async () => {
		const previousPepperUserId = uuidv4()
		const previousPepperUserEmail = faker.internet.email()
		const oldPassword = 'legacyPreviousPepperPass132'

		const legacyHash = await argon2.hash(oldPassword, {
			secret: Buffer.from(passwordHashingConfig.pepperPrevious),
		})

		await UserModel.bulkCreate([
			{
				id: previousPepperUserId,
				email: previousPepperUserEmail,
				name: 'Legacy previous pepper user',
				role: USER_ROLE.BASIC,
				isConfirmed: true,
				hash: legacyHash,
				issuedTokens: 1,
				tokenValidFromNumber: 0,
			},
		])

		const jwt = await createJwt(
			{ uid: previousPepperUserId, s: 1 },
			{ audience: passportConfig.jwt.user.audience }
		)

		const response = await request
			.put(endpoint())
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${jwt}`)
			.send({
				oldPassword,
				password: 'newPass132',
				passwordConfirmation: 'newPass132',
			})

		expect(response.status).toBe(200)
		expect(schema.validate(response.body).error).toBeUndefined()

		const user = (await UserModel.findByPk(previousPepperUserId)) as UserModel
		expect(await comparePasswordPreviousPepper('newPass132', user.hash)).toBe(false)
		expect(await comparePassword('newPass132', user.hash)).toBe(true)
	})

	it('Response should return code 200', async () => {
		const response = await request
			.put(endpoint())
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
