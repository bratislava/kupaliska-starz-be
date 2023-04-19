import { createUser } from './../../../../../src/db/factories/user'
import supertest from 'supertest'
import Joi from 'joi'
import app from '../../../../../src/app'
import {
	MESSAGE_TYPE,
	MESSAGE_TYPES,
	USER_ROLE,
} from '../../../../../src/utils/enums'
import { UserModel } from '../../../../../src/db/models/user'
import { v4 as uuidv4 } from 'uuid'

const endpoint = (id = userToBeDeletedId) => `/api/admin/users/${id}`
const userToBeDeletedId = uuidv4()
const superAdminToBeDeletedId = uuidv4()
const operatorToBeDeletedId = uuidv4()

const schema = Joi.object().keys({
	data: Joi.object().keys({
		id: Joi.string().guid({ version: ['uuidv4'] }),
	}),
	messages: Joi.array().items(
		Joi.object().keys({
			message: Joi.string().invalid('_NEPRELOZENE_'),
			type: Joi.string().valid(...MESSAGE_TYPES),
		})
	),
})

const schemaNotFound = Joi.object().keys({
	messages: Joi.array().items(
		Joi.object().keys({
			message: Joi.string().invalid('_NEPRELOZENE_'),
			type: Joi.string().valid(MESSAGE_TYPE.ERROR),
		})
	),
})

describe(`[DELETE] ${endpoint})`, () => {
	beforeAll(async () => {
		await UserModel.bulkCreate([
			createUser(userToBeDeletedId, USER_ROLE.SWIMMING_POOL_EMPLOYEE),
			createUser(superAdminToBeDeletedId, USER_ROLE.SUPER_ADMIN),
			createUser(operatorToBeDeletedId, USER_ROLE.OPERATOR),
		])
	})

	const request = supertest(app)

	it('Expect status 401 | Invalid or missing auth token', async () => {
		const response = await request
			.delete(endpoint())
			.set('Content-Type', 'application/json')
		expect(response.status).toBe(401)
	})

	it('Expect status 403 | Unathorized (Base user)', async () => {
		const response = await request
			.delete(endpoint())
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${process.env.jwtBase}`)
		expect(response.status).toBe(403)
	})

	it('Expect status 403 | Unathorized (Swimming operator)', async () => {
		const response = await request
			.delete(endpoint())
			.set('Content-Type', 'application/json')
			.set(
				'Authorization',
				`Bearer ${process.env.jwtSwimmingPoolOperator}`
			)
		expect(response.status).toBe(403)
	})

	it('Expect status 403 | Unathorized (Swimming employee)', async () => {
		const response = await request
			.delete(endpoint())
			.set('Content-Type', 'application/json')
			.set(
				'Authorization',
				`Bearer ${process.env.jwtSwimmingPoolEmployee}`
			)
		expect(response.status).toBe(403)
	})

	it('Response should return code 200', async () => {
		const response = await request
			.delete(endpoint())
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${process.env.jwtOperator}`)
		expect(response.status).toBe(200)
		expect(response.type).toBe('application/json')
		expect(schema.validate(response.body).error).toBeUndefined()

		const user = await UserModel.findByPk(response.body.data.id, {
			paranoid: false,
		})
		expect(user).toBeTruthy()
		expect(user.deletedAt).toBeTruthy()
	})

	it('Response should return code 404', async () => {
		const response = await request
			.delete(endpoint())
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${process.env.jwtOperator}`)
		expect(response.status).toBe(404)
		expect(response.type).toBe('application/json')
		expect(schemaNotFound.validate(response.body).error).toBeUndefined()
	})

	it('CANNOT delete SUPER_ADMIN', async () => {
		let response = await request
			.delete(endpoint(superAdminToBeDeletedId))
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${process.env.jwtSuperAdmin}`)

		expect(response.status).toBe(403)

		response = await request
			.delete(endpoint(superAdminToBeDeletedId))
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${process.env.jwtOperator}`)

		expect(response.status).toBe(403)
	})

	it('OPERATOR CANNOT delete another OPERATOR', async () => {
		const response = await request
			.delete(endpoint(operatorToBeDeletedId))
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${process.env.jwtOperator}`)

		expect(response.status).toBe(403)
	})
})
