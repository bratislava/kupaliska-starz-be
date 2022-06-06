import { ORDER_STATE } from './../../../../../src/utils/enums';
import supertest from 'supertest'
import Joi from 'joi'
import app from '../../../../../src/app'
import { MESSAGE_TYPES } from '../../../../../src/utils/enums'
import each from 'jest-each';
import { readdir, unlink } from 'fs/promises';
import path from 'path'
import config from 'config'
import { IAppConfig } from '../../../../../src/types/interfaces'
import { OrderModel } from '../../../../../src/db/models/order';
import * as webpay from '../../../../../src/utils/webpay';
import { DiscountCodeModel } from '../../../../../src/db/models/discountCode';
import { createDiscountCode } from '../../../../../src/db/factories/discountCode';
import faker from 'faker';
import { v4 as uuidv4 } from 'uuid';
import { DiscountCodeTicketTypeModel } from '../../../../../src/db/models/discountCodeTicketType';

const appConfig: IAppConfig = config.get('app')

const endpoint = '/api/v1/orders'

const schema = Joi.object().keys({
	data: Joi.object(),
	messages: Joi.array().items(Joi.object().keys({
		message: Joi.string().invalid('_NEPRELOZENE_'),
		type: Joi.string().valid(...MESSAGE_TYPES),
		path: Joi.string()
	}))
})

const schemaOK = Joi.object().keys({
	data: Joi.object().keys({
		id: Joi.string().guid({ version: ['uuidv4'] }).required(),
		url: Joi.string().required(),
		data: Joi.object().required(),
		dataToSign: Joi.string().required(),
		formurlencoded: Joi.string().required(),
	}),
	messages: Joi.array().items(Joi.object().keys({
		message: Joi.string().invalid('_NEPRELOZENE_'),
		type: Joi.string().valid(...MESSAGE_TYPES),
		path: Joi.string()
	}))
})

const clearAllFiles = async () => {
	const files = await readdir(path.join(appConfig.filesPath, 'private/profile-photos'))
	for (const file of files) {
		await unlink(path.join(appConfig.filesPath, 'private/profile-photos', file));
	}
}

let verifySignatureMock: any


describe('[POST] /api/v1/orders', () => {

	beforeEach(async () => {
		verifySignatureMock = jest.spyOn(webpay, "createSignature");
		verifySignatureMock.mockImplementation(() => ('digest'));

		jest.useFakeTimers('modern')
		jest.setSystemTime(new Date(process.env.globalTime))
	})

	afterEach(async () => {
		verifySignatureMock.mockRestore();
		jest.useRealTimers()
	})

	const request = supertest(app)

	describe('base tests', () => {

		it('Response should return code 400', async () => {
			const response = await request.post(endpoint)
				.set('Content-Type', 'application/json')
			expect(response.status).toBe(400)
			expect(response.type).toBe('application/json')
		})

		it('Response should return code 200', async () => {
			const response = await request.post(endpoint)
				.set('Content-Type', 'application/json')
				.send({
					tickets: [
						{
							age: 150,
							zip: '03251',
						}
					],
					email: faker.internet.email(),
					ticketTypeId: 'c70954c7-970d-4f1a-acf4-12b91acabe02',
					agreement: true,
					recaptcha: 'recaptcha123'
				})

			expect(response.status).toBe(200)
			expect(response.type).toBe('application/json')
			expect(schemaOK.validate(response.body).error).toBeUndefined()

			const order = await OrderModel.findByPk(response.body.data.id, {
				include: [
					{ association: 'tickets' },
					{ association: 'paymentOrder' },
				]
			})

			expect(order.tickets.length).toBe(1)
			expect(order.paymentOrder).toBeTruthy()
		})
	})

	describe('base validation tests', () => {

		it('Name and photo is optional (dependent on the ticket type)', async () => {
			const response = await request.post(endpoint)
				.set('Content-Type', 'application/json')
				.send({
					tickets: [
						{
							age: 150,
							zip: '03251',
						}
					],
					email: faker.internet.email(),
					ticketTypeId: 'c70954c7-970d-4f1a-acf4-12b91acabe02',
					agreement: true,
					recaptcha: 'recaptcha123'
				})
			expect(response.status).toBe(200)
		})


		it('Agreement must be true', async () => {
			const response = await request.post(endpoint)
				.set('Content-Type', 'application/json')
				.send({
					tickets: [
						{
							age: 150,
							zip: '03251',
						}
					],
					email: faker.internet.email(),
					ticketTypeId: 'c70954c7-970d-4f1a-acf4-12b91acabe02',
					agreement: true,
					recaptcha: 'recaptcha123'
				})
			expect(response.status).toBe(400)
			expect(response.body.messages[0].path).toBe('body.agreement')
		})

		it('User cannot buy a ticket after its expiration (dependent on the ticket type)', async () => {
			const response = await request.post(endpoint)
				.set('Content-Type', 'application/json')
				.send({
					tickets: [
						{
							age: 150,
							zip: '03251',
						}
					],
					email: faker.internet.email(),
					ticketTypeId: 'c70954c7-970d-4f1a-acf4-12b91acabe05',
					agreement: true,
					recaptcha: 'recaptcha123'
				})
			expect(response.status).toBe(400)
			expect(schema.validate(response.body).error).toBeUndefined()
			expect(response.body.messages[0].path).toBe('ticketHasExpired')

		})
	})

	

	describe('business logic tests', () => {

		it('Order should have correct state', async () => {

			const response = await request.post(endpoint)
				.set('Content-Type', 'application/json')
				.send({
					tickets: [
						{
							age: 150,
							zip: '03251',
						}
					],
					email: faker.internet.email(),
					ticketTypeId: 'c70954c7-970d-4f1a-acf4-12b91acabe05',
					agreement: true,
					recaptcha: 'recaptcha123'
				})
			expect(response.status).toBe(200)
			const order = await OrderModel.findByPk(response.body.data.id)
			expect(order.state).toStrictEqual(ORDER_STATE.CREATED)
		})

	})

	describe('Order with discount code', () => {

		const discountCodeId = uuidv4()
		const discountCodeId2 = uuidv4()
		const discountCode = faker.random.alphaNumeric(8)
		const discountCode2 = faker.random.alphaNumeric(8)

		beforeAll(async () => {
			await DiscountCodeModel.bulkCreate([
				{
					...createDiscountCode(discountCodeId, discountCode),
					amount: 20
				},
				{
					...createDiscountCode(discountCodeId2, discountCode2),
					amount: 99
				}
			])

			await DiscountCodeTicketTypeModel.bulkCreate([
				{
					ticketTypeId: 'c70954c7-970d-4f1a-acf4-12b91acabe06',
					discountCodeId: discountCodeId
				},
				{
					ticketTypeId: 'c70954c7-970d-4f1a-acf4-12b91acabe02',
					discountCodeId: discountCodeId2
				}
			])
		})

		it('Order should have correct discount', async () => {

			const response = await request.post(endpoint)
				.set('Content-Type', 'application/json')
				.send({
					tickets: [
						{
							age: 150,
							zip: '03251',
						}
					],
					email: faker.internet.email(),
					ticketTypeId: 'c70954c7-970d-4f1a-acf4-12b91acabe06',
					discountCode: discountCode,
					agreement: true,
					recaptcha: 'recaptcha123'
				})
			expect(response.status).toBe(200)
			const order = await OrderModel.findByPk(response.body.data.id)
			expect(order.price).toStrictEqual(127.96)
			expect(order.discount).toStrictEqual(32)

			const discountCodeInstance = await DiscountCodeModel.findByPk(discountCodeId)

			expect(discountCodeInstance.usedAt).not.toBeNull()
			expect(order.discountCodeId).toBe(discountCodeId)
		})
	})
})
