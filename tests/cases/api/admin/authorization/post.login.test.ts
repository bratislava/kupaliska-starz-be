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
} from '../../../../../src/utils/authorization'
import { IPasswordHashingConfig } from '../../../../../src/types/interfaces'

const passwordHashingConfig: IPasswordHashingConfig = config.get('passwordHashing')

const endpoint = '/api/admin/authorization/login'

const schema = Joi.object().keys({
	data: Joi.object().keys({
		accessToken: Joi.string().required(),
		profile: Joi.object().keys({
			id: Joi.string()
				.guid({ version: ['uuidv4'] })
				.required(),
			name: Joi.string().required(),
			role: Joi.string().required(),
			email: Joi.string().required(),
			lastLoginAt: Joi.string().required(),
			swimmingPools: Joi.array(),
		}),
	}),
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

	it('Expect status 401 | Unauthorized', async () => {
		const response = await request.post(endpoint).set('Content-Type', 'application/json').send({
			email: 'admin@amcef.com',
			password: 'amcefPass13',
		})
		expect(response.status).toBe(401)
	})

	it('Should migrate legacy bcrypt hash to argon2 on successful login', async () => {
		const bcryptUserId = uuidv4()
		const bcryptUserEmail = faker.internet.email()
		const password = 'legacyBcryptPass132'

		await UserModel.bulkCreate([
			{
				id: bcryptUserId,
				email: bcryptUserEmail,
				name: 'Legacy bcrypt user',
				role: USER_ROLE.OPERATOR,
				isConfirmed: true,
				hash: bcrypt.hashSync(password, bcrypt.genSaltSync(12)),
				issuedTokens: 1,
				tokenValidFromNumber: 0,
			},
		])

		const response = await request.post(endpoint).set('Content-Type', 'application/json').send({
			email: bcryptUserEmail,
			password,
		})

		expect(response.status).toBe(200)
		expect(schema.validate(response.body).error).toBeUndefined()

		const user = (await UserModel.findByPk(bcryptUserId)) as UserModel
		expect(await comparePasswordBcrypt(password, user.hash)).toBe(false)
		expect(await comparePassword(password, user.hash)).toBe(true)
	})

	it('Should migrate legacy previous-pepper hash to current pepper on successful login', async () => {
		const previousPepperUserId = uuidv4()
		const previousPepperUserEmail = faker.internet.email()
		const password = 'legacyPreviousPepperPass132'

		const legacyHash = await argon2.hash(password, {
			secret: Buffer.from(passwordHashingConfig.pepperPrevious),
		})

		await UserModel.bulkCreate([
			{
				id: previousPepperUserId,
				email: previousPepperUserEmail,
				name: 'Legacy previous pepper user',
				role: USER_ROLE.OPERATOR,
				isConfirmed: true,
				hash: legacyHash,
				issuedTokens: 1,
				tokenValidFromNumber: 0,
			},
		])

		const response = await request.post(endpoint).set('Content-Type', 'application/json').send({
			email: previousPepperUserEmail,
			password,
		})

		expect(response.status).toBe(200)
		expect(schema.validate(response.body).error).toBeUndefined()

		const user = (await UserModel.findByPk(previousPepperUserId)) as UserModel
		expect(await comparePasswordPreviousPepper(password, user.hash)).toBe(false)
		expect(await comparePassword(password, user.hash)).toBe(true)
	})

	it('Response should return status code 200', async () => {
		const response = await request.post(endpoint).set('Content-Type', 'application/json').send({
			email: 'admin@amcef.com',
			password: 'amcefPass132',
		})

		expect(response.type).toBe('application/json')
		expect(response.status).toBe(200)
		expect(schema.validate(response.body).error).toBeUndefined()
	})
})
