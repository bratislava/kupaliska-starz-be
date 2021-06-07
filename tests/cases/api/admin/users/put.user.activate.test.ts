import supertest from 'supertest'
import Joi from 'joi'
import app from '../../../../../src/app'
import { MESSAGE_TYPES, USER_ROLE } from '../../../../../src/utils/enums'
import { UserModel } from '../../../../../src/db/models/user'
import { v4 as uuidv4 } from 'uuid';
import { createUser } from '../../../../../src/db/factories/user'
import { Sequelize } from 'sequelize'

const endpoint = (id = employeeToBeActivateId) => `/api/admin/users/${id}/activate`

const schema = Joi.object().keys({
	data: Joi.object().keys({
		id: Joi.string().guid({ version: ['uuidv4'] }),
	}),
	messages: Joi.array().items(Joi.object().keys({
		message: Joi.string().invalid('_NEPRELOZENE_'),
		type: Joi.string().valid(...MESSAGE_TYPES),
		path: Joi.string()
	}))
})

const employeeToBeActivateId = uuidv4()
const operatorToBeActivateId = uuidv4()
const superAdminToBeActivateId = uuidv4()

describe(`[PUT] ${endpoint})`, () => {

	beforeAll(async () => {
		await UserModel.bulkCreate([
			{ ...createUser(employeeToBeActivateId, USER_ROLE.SWIMMING_POOL_EMPLOYEE),
				deletedAt: Sequelize.literal('CURRENT_TIMESTAMP')
			},
			{ ...createUser(superAdminToBeActivateId, USER_ROLE.SUPER_ADMIN),
				deletedAt: Sequelize.literal('CURRENT_TIMESTAMP')
			},
			{ ...createUser(operatorToBeActivateId, USER_ROLE.OPERATOR),
				deletedAt: Sequelize.literal('CURRENT_TIMESTAMP')
			}
		])
	})

	const request = supertest(app)

	it('Expect status 401 | Invalid or missing auth token', async () => {
		const response = await request.put(endpoint())
			.set('Content-Type', 'application/json')
		expect(response.status).toBe(401)
	})

	it('Expect status 403 | Unathorized (Base user)', async () => {
		const response = await request.put(endpoint())
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${process.env.jwtBase}`)
		expect(response.status).toBe(403)
	})

	it('Expect status 403 | Unathorized (Swimming operator)', async () => {
		const response = await request.put(endpoint())
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${process.env.jwtSwimmingPoolOperator}`)
		expect(response.status).toBe(403)

	})

	it('Expect status 403 | Unathorized (Swimming employee)', async () => {
		const response = await request.put(endpoint())
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${process.env.jwtSwimmingPoolEmployee}`)
		expect(response.status).toBe(403)
	})

	it('Response should return code 200', async () => {
		const response = await request.put(endpoint())
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${process.env.jwtOperator}`)
			.send()

		expect(response.status).toBe(200)
		expect(response.type).toBe('application/json')
		expect(schema.validate(response.body).error).toBeUndefined()

		const user = await UserModel.findByPk(response.body.data.id)
		expect(user).toBeTruthy()
	})

	it('Super admin CAN activate OPERATOR', async () => {
		const response = await request.put(endpoint(operatorToBeActivateId))
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${process.env.jwtSuperAdmin}`)
			.send()
		expect(response.status).toBe(200)
		expect(schema.validate(response.body).error).toBeUndefined()

		const user = await UserModel.findByPk(response.body.data.id)
		expect(user).toBeTruthy()
	})

	it('Super admin CANOT activate SUPER ADMIN', async () => {
		const response = await request.put(endpoint(superAdminToBeActivateId))
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${process.env.jwtSuperAdmin}`)
			.send()
		expect(response.status).toBe(403)
	})


	it('Operator CANOT activate SUPER ADMIN or OPERATOR', async () => {
		let response = await request.put(endpoint(superAdminToBeActivateId))
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${process.env.jwtOperator}`)
			.send()

		expect(response.status).toBe(403)

		response = await request.put(endpoint(operatorToBeActivateId))
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${process.env.jwtOperator}`)
			.send()

		expect(response.status).toBe(403)
	})

})
