import supertest from 'supertest'
import Joi from 'joi'
import app from '../../../../../src/app'
import { MESSAGE_TYPES, USER_ROLE } from '../../../../../src/utils/enums'
import { UserModel } from '../../../../../src/db/models/user'
import faker from 'faker'
import { v4 as uuidv4 } from 'uuid';
import { createUser } from '../../../../../src/db/factories/user'

const endpoint = (id = employeeToBeUpdatedId) => `/api/admin/users/${id}`

const schema = Joi.object().keys({
	data: Joi.object().keys({
		id: Joi.string().guid({ version: ['uuidv4'] }),
		user: Joi.object()
	}),
	messages: Joi.array().items(Joi.object().keys({
		message: Joi.string().invalid('_NEPRELOZENE_'),
		type: Joi.string().valid(...MESSAGE_TYPES),
		path: Joi.string()
	}))
})

const employeeToBeUpdatedId = uuidv4()
const operatorToBeUpdatedId = uuidv4()
const superAdminToBeUpdatedId = uuidv4()

describe(`[PUT] ${endpoint})`, () => {

	beforeAll(async () => {
		await UserModel.bulkCreate([
			createUser(employeeToBeUpdatedId, USER_ROLE.SWIMMING_POOL_EMPLOYEE ),
			createUser(superAdminToBeUpdatedId, USER_ROLE.SUPER_ADMIN ),
			createUser(operatorToBeUpdatedId, USER_ROLE.OPERATOR )
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
			.send({
				name: 'Updated changed',
				email: 'changed@example.sk',
				role: USER_ROLE.SWIMMING_POOL_EMPLOYEE,
				swimmingPools: ['c70954c7-970d-4f1a-acf4-12b91acabe01'],
				isConfirmed: false,
			})
		expect(response.status).toBe(200)
		expect(response.type).toBe('application/json')
		expect(schema.validate(response.body).error).toBeUndefined()

		expect(response.body.data.user.name).toBe('Updated changed')
		expect(response.body.data.user.email).toBe('changed@example.sk')
		expect(response.body.data.user.role).toBe(USER_ROLE.SWIMMING_POOL_EMPLOYEE)
		expect(response.body.data.user.swimmingPools).toStrictEqual([{ id: 'c70954c7-970d-4f1a-acf4-12b91acabe01', name: 'Delfín' }])
		expect(response.body.data.user.isConfirmed).toBe(false)
	})

	it('Super admin CAN update OPERATOR', async () => {
		const response = await request.put(endpoint(operatorToBeUpdatedId))
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${process.env.jwtSuperAdmin}`)
			.send({
				name: 'Jozko Mak',
				email: faker.internet.email(),
				role: USER_ROLE.OPERATOR,
				isConfirmed: true,
			})
		expect(response.status).toBe(200)
		expect(schema.validate(response.body).error).toBeUndefined()
	})

	it('Super admin CANOT update SUPER ADMIN', async () => {
		const response = await request.put(endpoint(superAdminToBeUpdatedId))
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${process.env.jwtSuperAdmin}`)
			.send({
				name: 'Jozko Mak',
				email: faker.internet.email(),
				role: USER_ROLE.OPERATOR,
				isConfirmed: true,
			})
		expect(response.status).toBe(403)
	})

	it('Super admin CANOT change role to SUPER_ADMIN', async () => {
		const response = await request.put(endpoint(operatorToBeUpdatedId))
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${process.env.jwtSuperAdmin}`)
			.send({
				name: 'Jozko Mak',
				email: faker.internet.email(),
				role: USER_ROLE.SUPER_ADMIN,
				isConfirmed: true,
			})
		expect(response.status).toBe(403)
	})

	it('Operator CANOT update SUPER ADMIN or OPERATOR', async () => {
		let response = await request.put(endpoint(superAdminToBeUpdatedId))
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${process.env.jwtOperator}`)
			.send({
				name: 'Jozko Mak',
				email: faker.internet.email(),
				role: USER_ROLE.SWIMMING_POOL_OPERATOR,
				swimmingPools: ['c70954c7-970d-4f1a-acf4-12b91acabe01'],
				isConfirmed: true,
			})

		expect(response.status).toBe(403)

		response = await request.put(endpoint(operatorToBeUpdatedId))
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${process.env.jwtOperator}`)
			.send({
				name: 'Jozko Mak',
				email: faker.internet.email(),
				role: USER_ROLE.SWIMMING_POOL_EMPLOYEE,
				swimmingPools: ['c70954c7-970d-4f1a-acf4-12b91acabe01'],
				isConfirmed: true,
			})

		expect(response.status).toBe(403)
	})

	it('Operator CANOT change role to SUPER ADMIN or OPERATOR', async () => {
		let response = await request.put(endpoint(employeeToBeUpdatedId))
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${process.env.jwtOperator}`)
			.send({
				name: 'Jozko Mak',
				email: faker.internet.email(),
				role: USER_ROLE.SUPER_ADMIN,
				isConfirmed: true,
			})

		expect(response.status).toBe(403)

		response = await request.put(endpoint(employeeToBeUpdatedId))
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${process.env.jwtOperator}`)
			.send({
				name: 'Jozko Mak',
				email: faker.internet.email(),
				role: USER_ROLE.OPERATOR,
				isConfirmed: true,
			})

		expect(response.status).toBe(403)
	})

})
