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
							quantity: 1,
							ticketTypeId: 'c70954c7-970d-4f1a-acf4-12b91acabe02',
							name: 'Jozef Mak',
							age: 150,
							zip: '03251',
							email: faker.internet.email(),
						}
					],
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
							quantity: 1,
							ticketTypeId: 'c70954c7-970d-4f1a-acf4-12b91acabe03',
							age: 18,
							zip: '03251',
							email: faker.internet.email(),
						}
					],
					agreement: true,
					recaptcha: 'recaptcha123'
				})
			expect(response.status).toBe(200)
		})

		it('Max number of the tickets exceeded', async () => {
			const response = await request.post(endpoint)
				.set('Content-Type', 'application/json')
				.send({
					tickets: [
						{
							quantity: Number(appConfig.maxTicketPurchaseLimit) + 1,
							ticketTypeId: 'c70954c7-970d-4f1a-acf4-12b91acabe03',
							age: 18,
							zip: '03251',
							email: faker.internet.email(),
						}
					]
				})
			expect(response.status).toBe(400)
			expect(response.body.messages[0].path).toBe('body.tickets.0.quantity')
		})

		it('Seasonal ticket`s quantity should be 1', async () => {
			const response = await request.post(endpoint)
				.set('Content-Type', 'application/json')
				.send({
					tickets: [
						{
							quantity: 2,
							ticketTypeId: 'c70954c7-970d-4f1a-acf4-12b91acabe03',
							age: 18,
							name: 'Jozko Mak',
							zip: '03251',
							email: faker.internet.email(),
						}
					],
					agreement: true,
					recaptcha: 'recaptcha123'
				})
			expect(response.status).toBe(400)
			expect(schema.validate(response.body).error).toBeUndefined()
			expect(response.body.messages[0].path).toBe('seasonTicketMustHaveOneQuantity')
		})

		it('Children are not allowed (dependent on the ticket type)', async () => {
			const response = await request.post(endpoint)
				.set('Content-Type', 'application/json')
				.send({
					tickets: [
						{
							quantity: 1,
							ticketTypeId: 'c70954c7-970d-4f1a-acf4-12b91acabe03',
							age: 18,
							zip: '03251',
							email: faker.internet.email(),
							children: [{ name: 'Majka', age: 15 }]
						}
					],
					agreement: true,
					recaptcha: 'recaptcha123'
				})
			expect(response.status).toBe(400)
			expect(schema.validate(response.body).error).toBeUndefined()
			expect(response.body.messages[0].path).toBe('childrenAreNotAllowed')

		})

		it('Max number of the children exceeded (dependent on the ticket type)', async () => {
			const response = await request.post(endpoint)
				.set('Content-Type', 'application/json')
				.send({
					tickets: [
						{
							quantity: 1,
							ticketTypeId: 'c70954c7-970d-4f1a-acf4-12b91acabe04',
							age: 18,
							zip: '03251',
							email: faker.internet.email(),
							children: [
								{ name: 'Majka', age: 15 },
								{ name: 'Jozko', age: 15 },
								{ name: 'Mirka', age: 15 },
							]
						}
					],
					agreement: true,
					recaptcha: 'recaptcha123'
				})
			expect(response.status).toBe(400)
			expect(schema.validate(response.body).error).toBeUndefined()
			expect(response.body.messages[0].path).toBe('numberOfChildrenExceeded')
		})

		it('Agreement must be true', async () => {
			const response = await request.post(endpoint)
				.set('Content-Type', 'application/json')
				.send({
					tickets: [
						{
							quantity: 1,
							ticketTypeId: 'c70954c7-970d-4f1a-acf4-12b91acabe03',
							age: 18,
							zip: '03251',
							email: faker.internet.email(),
						}
					],
					agreement: false,
					recaptcha: 'recaptcha123'
				})
			expect(response.status).toBe(400)
			expect(response.body.messages[0].path).toBe('body.agreement')
		})

		each([ // age, valid(true/false)
			[2, false],
			[18, false],
			[100, false],
			[3, true],
			[17, true],
			[10, true],
		]).it("Children`s age must be in the range when the input is '%s' (dependent on the ticket type)", async (age, expected) => {
			let response = await request.post(endpoint)
				.set('Content-Type', 'application/json')
				.send({
					tickets: [
						{
							quantity: 1,
							ticketTypeId: 'c70954c7-970d-4f1a-acf4-12b91acabe04',
							age: 18,
							zip: '03251',
							email: faker.internet.email(),
							children: [
								{ name: 'Majka', age: age },
							]
						}
					],
					agreement: true,
					recaptcha: 'recaptcha123'
				})

			expect(response.status).toBe(expected === true ? 200 : 400)
			if (expected === false) {
				expect(response.body.messages[0].path).toBe('childrenHasInvalidAge')
			}
		})

		it('User cannot buy a ticket after its expiration (dependent on the ticket type)', async () => {
			const response = await request.post(endpoint)
				.set('Content-Type', 'application/json')
				.send({
					tickets: [
						{
							quantity: 1,
							ticketTypeId: 'c70954c7-970d-4f1a-acf4-12b91acabe05',
							age: 18,
							zip: '03251',
							email: faker.internet.email(),
						}
					],
					agreement: true,
					recaptcha: 'recaptcha123'
				})
			expect(response.status).toBe(400)
			expect(schema.validate(response.body).error).toBeUndefined()
			expect(response.body.messages[0].path).toBe('ticketHasExpired')

		})
	})

	describe('files validation tests', () => {

		beforeEach(async () => {
			await clearAllFiles()
		})
		it('Files shoud be successfully uploaded to the private/profile-photos', async () => {

			const files = await readdir(path.join(appConfig.filesPath, 'private/profile-photos'))

			const response = await request.post(endpoint)
				.set('Content-Type', 'application/json')
				.send({
					tickets: [
						{
							quantity: 1,
							ticketTypeId: 'c70954c7-970d-4f1a-acf4-12b91acabe07',
							age: 18,
							zip: '03251',
							email: faker.internet.email(),
							photo: "data:image/jpeg;base64,asda"
						}
					],
					agreement: true,
					recaptcha: 'recaptcha123'
				})
			expect(response.status).toBe(200)
			const newFiles = await readdir(path.join(appConfig.filesPath, 'private/profile-photos'))
			expect(newFiles.length).toBe(files.length + 1)

		})
	})

	describe('business logic tests', () => {

		it('Should have correct price (Ticket with children)', async () => {

			const response = await request.post(endpoint)
				.set('Content-Type', 'application/json')
				.send({
					tickets: [
						{
							quantity: 1,
							ticketTypeId: 'c70954c7-970d-4f1a-acf4-12b91acabe04',
							age: 18,
							zip: '03251',
							email: faker.internet.email(),
							children: [
								{ name: 'Majka', age: 10 },
								{ name: 'Michal', age: 10 },
							]
						}
					],
					agreement: true,
					recaptcha: 'recaptcha123'
				})
			expect(response.status).toBe(200)
			const order = await OrderModel.findByPk(response.body.data.id, { include: { association: 'tickets' } })
			expect(order.price).toStrictEqual(22)
			expect(order.tickets[0].price).toStrictEqual(20)
		})

		it('Should have correct price (Ticket with quantity)', async () => {

			const response = await request.post(endpoint)
				.set('Content-Type', 'application/json')
				.send({
					tickets: [
						{
							quantity: 4,
							ticketTypeId: 'c70954c7-970d-4f1a-acf4-12b91acabe06',
							age: 18,
							zip: '03251',
							email: faker.internet.email(),
						}
					],
					agreement: true,
					recaptcha: 'recaptcha123'
				})
			expect(response.status).toBe(200)
			const order = await OrderModel.findByPk(response.body.data.id, {
				include: [
					{ association: 'tickets' },
					{ association: 'paymentOrder' },
				]
			})
			expect(order.price).toStrictEqual(159.96)
			order.tickets.forEach((ticket: any) => {
				expect(ticket.price).toStrictEqual(39.99)
			})
			expect(order.paymentOrder.paymentAmount).toBe(159.96)
			expect(response.body.data.data.AMOUNT).toStrictEqual(15996)
		})

		it('Order should have correct state', async () => {

			const response = await request.post(endpoint)
				.set('Content-Type', 'application/json')
				.send({
					tickets: [
						{
							quantity: 1,
							ticketTypeId: 'c70954c7-970d-4f1a-acf4-12b91acabe06',
							age: 18,
							zip: '03251',
							email: faker.internet.email(),
						}
					],
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
		const discountCode = faker.random.alphaNumeric(8)

		beforeAll(async () => {
			await DiscountCodeModel.bulkCreate([
				{
					...createDiscountCode(discountCodeId, discountCode),
					amount: 20
				}
			])

			await DiscountCodeTicketTypeModel.bulkCreate([
				{
					ticketTypeId: 'c70954c7-970d-4f1a-acf4-12b91acabe06',
					discountCodeId: discountCodeId
				}
			])
		})

		it('Order should have correct discount', async () => {

			const response = await request.post(endpoint)
				.set('Content-Type', 'application/json')
				.send({
					tickets: [
						{
							quantity: 4,
							ticketTypeId: 'c70954c7-970d-4f1a-acf4-12b91acabe06',
							age: 18,
							zip: '03251',
							email: faker.internet.email()
						}
					],
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
