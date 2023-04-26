import supertest from 'supertest'
import app from '../../../../../src/app'
import { DiscountCodeModel } from '../../../../../src/db/models/discountCode'
import { createDiscountCode } from '../../../../../src/db/factories/discountCode'
import faker from 'faker'
import { v4 as uuidv4 } from 'uuid'
import { DiscountCodeTicketTypeModel } from '../../../../../src/db/models/discountCodeTicketType'
import MockDate from 'mockdate'

const endpoint = (discountCode: string, ticketTypeId: string) =>
	`/api/v1/orders/discountCodes/${discountCode}/ticketTypes/${ticketTypeId}`

const discountCode = faker.random.alphaNumeric(8)
const discountCodeUsedAt = faker.random.alphaNumeric(8)
const discountCodeId = uuidv4()
const discountCodeUsedId = uuidv4()

describe(`[GET] ${endpoint}`, () => {
	const request = supertest(app)

	beforeAll(async () => {
		await DiscountCodeModel.bulkCreate([
			{
				...createDiscountCode(discountCodeId, discountCode),
				amount: 20,
			},
			{
				...createDiscountCode(discountCodeUsedId, discountCodeUsedAt),
				usedAt: '2021-04-11 23:59:59',
			},
		])

		await DiscountCodeTicketTypeModel.bulkCreate([
			{
				ticketTypeId: 'c70954c7-970d-4f1a-acf4-12b91acabe06',
				discountCodeId: discountCodeId,
			},
			{
				ticketTypeId: 'c70954c7-970d-4f1a-acf4-12b91acabe06',
				discountCodeId: discountCodeUsedId,
			},
		])
	})

	it('Discount code not found', async () => {
		const invalidDiscountCode = faker.random.alphaNumeric(8)
		const response = await request
			.get(
				endpoint(
					invalidDiscountCode,
					'c70954c7-970d-4f1a-acf4-12b91acabe06'
				)
			)
			.set('Content-Type', 'application/json')

		expect(response.status).toBe(404)
		expect(response.type).toBe('application/json')
	})

	it('Discount code not between valid dates', async () => {
		MockDate.set('2021-04-11 23:59:59')

		let response = await request
			.get(endpoint(discountCode, 'c70954c7-970d-4f1a-acf4-12b91acabe06'))
			.set('Content-Type', 'application/json')

		expect(response.status).toBe(404)

		MockDate.set('2021-07-13 00:00:00')

		response = await request
			.get(endpoint(discountCode, 'c70954c7-970d-4f1a-acf4-12b91acabe06'))
			.set('Content-Type', 'application/json')

		expect(response.status).toBe(404)

		MockDate.reset()
	})

	it('Discount code already used', async () => {
		MockDate.set('2021-05-03 17:19:35')

		const response = await request
			.get(
				endpoint(
					discountCodeUsedAt,
					'c70954c7-970d-4f1a-acf4-12b91acabe06'
				)
			)
			.set('Content-Type', 'application/json')

		expect(response.status).toBe(404)
		expect(response.type).toBe('application/json')

		MockDate.reset()
	})

	it('Bad ticket type', async () => {
		MockDate.set('2021-06-11 23:59:59')

		const response = await request
			.get(endpoint(discountCode, uuidv4()))
			.set('Content-Type', 'application/json')

		expect(response.status).toBe(404)
		expect(response.type).toBe('application/json')

		MockDate.reset()
	})

	it('Response should return code 200', async () => {
		MockDate.set('2021-04-12 00:00:00')

		let response = await request
			.get(endpoint(discountCode, 'c70954c7-970d-4f1a-acf4-12b91acabe06'))
			.set('Content-Type', 'application/json')

		expect(response.status).toBe(200)
		expect(response.type).toBe('application/json')

		expect(response.body.discountCode.code).toBe(discountCode.toUpperCase())
		expect(response.body.discountCode.amount).toStrictEqual(20)

		MockDate.set('2021-07-12 23:59:59')

		response = await request
			.get(endpoint(discountCode, 'c70954c7-970d-4f1a-acf4-12b91acabe06'))
			.set('Content-Type', 'application/json')

		expect(response.status).toBe(200)

		MockDate.reset()
	})
})
