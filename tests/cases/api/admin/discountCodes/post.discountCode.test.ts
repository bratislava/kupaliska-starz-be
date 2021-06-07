import { createTicketType } from './../../../../../src/db/factories/ticketType';
import supertest from 'supertest'
import Joi from 'joi'
import app from '../../../../../src/app'
import { MESSAGE_TYPES } from '../../../../../src/utils/enums'
import { TicketTypeModel } from '../../../../../src/db/models/ticketType'
import { v4 as uuidv4 } from 'uuid';
import { DiscountCodeModel } from '../../../../../src/db/models/discountCode';

const endpoint = '/api/admin/discountCodes'

const schema = Joi.object().keys({
	data: Joi.object(),
	messages: Joi.array().items(Joi.object().keys({
		message: Joi.string().invalid('_NEPRELOZENE_'),
		type: Joi.string().valid(...MESSAGE_TYPES),
		path: Joi.string()
	}))
})

const ticketTypeId = uuidv4()

describe(`[POST] ${endpoint})`, () => {

	beforeAll(async () => {
		await TicketTypeModel.bulkCreate([
			createTicketType(ticketTypeId)
		])
	})

	const request = supertest(app)

	it('Expect status 401 | Invalid or missing auth token', async () => {
		const response = await request.post(endpoint)
			.set('Content-Type', 'application/json')
		expect(response.status).toBe(401)
	})

	it('Expect status 403 | Unathorized (Base user)', async () => {
		const response = await request.post(endpoint)
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${process.env.jwtBase}`)
		expect(response.status).toBe(403)
	})

	it('Expect status 403 | Unathorized (Swimming operator)', async () => {
		const response = await request.post(endpoint)
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${process.env.jwtSwimmingPoolOperator}`)
		expect(response.status).toBe(403)
	})

	it('Expect status 403 | Unathorized (Swimming employee)', async () => {
		const response = await request.post(endpoint)
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${process.env.jwtSwimmingPoolEmployee}`)
		expect(response.status).toBe(403)
	})

	it('Response should return code 200', async () => {
		const response = await request.post(endpoint)
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${process.env.jwtOperator}`)
			.send({
				quantity: 5,
				amount: 20.5,
				validFrom: "2021-04-12",
				validTo: "2021-07-12",
				ticketTypes: [ticketTypeId]
			})

		expect(response.status).toBe(200)
		expect(response.type).toBe('application/json')
		expect(schema.validate(response.body).error).toBeUndefined()
		expect(response.body.data.discountCodes).toHaveLength(5)

		expect(response.body.data.discountCodes[4].amount).toStrictEqual(20.50)
		expect(response.body.data.discountCodes[4].validFrom).toBe("2021-04-12")
		expect(response.body.data.discountCodes[4].validTo).toBe("2021-07-12")
		expect(response.body.data.discountCodes[4].code).toBeTruthy()
		expect(response.body.data.discountCodes[4].code.length > 7).toBeTruthy()

		const discountCode = await DiscountCodeModel.findByPk(response.body.data.discountCodes[4].id,
			{ include: { association: 'ticketTypes'}})

		expect(discountCode.ticketTypes).toHaveLength(1)
		expect(discountCode.ticketTypes[0].id).toBe(ticketTypeId)
	})
})

