import * as webpay from './../../../../../src/utils/webpay';
import formurlencoded from 'form-urlencoded';
import { ORDER_STATE } from './../../../../../src/utils/enums';
import supertest from 'supertest'
import Joi from 'joi'
import app from '../../../../../src/app'
import config from 'config'
import { IAppConfig } from '../../../../../src/types/interfaces'
import { OrderModel } from '../../../../../src/db/models/order';
import { Op } from 'sequelize';
import url from 'url'
import queryString from 'query-string'

const endpoint = '/api/v1/orders/webpay/response'

describe(`[GET] ${endpoint})`, () => {
	const request = supertest(app)

	it('Request without DIGEST params should return success=false ', async () => {

		const response = await request.get(`${endpoint}`)
			.set('Content-Type', 'application/json')
			.send()

		expect(response.headers.location.split('?')[1]).toBeTruthy()
		expect(response.headers.location.split('?')[1]).toBe('success=false')
	})

	it('Request without PRCODE and SRCODE param should return success=false ', async () => {

		const queryParams = formurlencoded({
			DIGEST: 'digest',
			DIGEST1: 'digest1'
		})

		const response = await request.get(`${endpoint}/?${queryParams}`)
			.set('Content-Type', 'application/json')
			.send()

		expect(response.headers.location.split('?')[1]).toBeTruthy()
		expect(response.headers.location.split('?')[1]).toBe('success=false')
	})

	it('Request without ORDER NUMBER param should return success=false ', async () => {

		const queryParams = formurlencoded({
			DIGEST: 'digest',
			DIGEST1: 'digest1',
			PRCODE: 0,
			SRCODE: 0
		})

		const response = await request.get(`${endpoint}/?${queryParams}`)
			.set('Content-Type', 'application/json')
			.send()

		expect(response.headers.location.split('?')[1]).toBeTruthy()
		expect(response.headers.location.split('?')[1]).toBe('success=false')
	})

	it('Request with wrong ORDERNUMBER param should return success=false ', async () => {

		const queryParams = formurlencoded({
			DIGEST: 'digest',
			DIGEST1: 'digest1',
			PRCODE: 0,
			SRCODE: 0,
			ORDERNUMBER: 10000,
		})

		const response = await request.get(`${endpoint}/?${queryParams}`)
			.set('Content-Type', 'application/json')
			.send()

		expect(response.headers.location.split('?')[1]).toBeTruthy()
		expect(response.headers.location.split('?')[1]).toBe('success=false')
	})

	it('Order without payment order should return success=false', async () => {

		const queryParams = formurlencoded({
			DIGEST: 'digest',
			DIGEST1: 'digest1',
			PRCODE: 0,
			SRCODE: 0,
			ORDERNUMBER: 49,
		})

		const response = await request.get(`${endpoint}/?${queryParams}`)
			.set('Content-Type', 'application/json')
			.send()

		expect(response.headers.location.split('?')[1]).toBeTruthy()
		expect(response.headers.location.split('?')[1]).toBe('success=false')
	})

	it('Is not verified', async () => {

		const verifySignatureMock = jest.spyOn(webpay, "verifySignature");
		verifySignatureMock.mockImplementation(() => (false));

		const queryParams = formurlencoded({
			DIGEST: 'digest',
			DIGEST1: 'digest1',
			PRCODE: 0,
			SRCODE: 0,
			ORDERNUMBER: 50,
		})

		const response = await request.get(`${endpoint}/?${queryParams}`)
			.set('Content-Type', 'application/json')
			.send()

		expect(response.headers.location.split('?')[1]).toBeTruthy()
		expect(response.headers.location.split('?')[1]).toBe('success=false')

		const order = await OrderModel.findOne({
			where: {
				orderNumber: {
					[Op.eq]: 50
				}
			},
			include: {
				association: 'paymentOrder',
				include: [{ association: 'paymentResponse' }]
			}
		})

		expect(order.state).toBe(ORDER_STATE.FAILED)
		expect(order.paymentOrder.paymentResponse.isVerified).toBe(false)
		expect(order.paymentOrder.paymentResponse.isSuccess).toBe(true)

		verifySignatureMock.mockRestore();
	})

	it('Is not successful', async () => {

		const verifySignatureMock = jest.spyOn(webpay, "verifySignature");
		verifySignatureMock.mockImplementation(() => (true));

		const queryParams = formurlencoded({
			DIGEST: 'digest',
			DIGEST1: 'digest1',
			PRCODE: 1,
			SRCODE: 0,
			ORDERNUMBER: 51,
		})

		const response = await request.get(`${endpoint}/?${queryParams}`)
			.set('Content-Type', 'application/json')
			.send()

		expect(response.headers.location.split('?')[1]).toBeTruthy()
		expect(response.headers.location.split('?')[1]).toBe('success=false')

		const order = await OrderModel.findOne({
			where: {
				orderNumber: {
					[Op.eq]: 51
				}
			},
			include: {
				association: 'paymentOrder',
				include: [{ association: 'paymentResponse' }]
			}
		})

		expect(order.state).toBe(ORDER_STATE.FAILED)
		expect(order.paymentOrder.paymentResponse.isVerified).toBe(true)
		expect(order.paymentOrder.paymentResponse.isSuccess).toBe(false)

		verifySignatureMock.mockRestore();
	})

	it('Payment is successful', async () => {
		const verifySignatureMock = jest.spyOn(webpay, "verifySignature");
		verifySignatureMock.mockImplementation(() => (true));

		const queryParams = formurlencoded({
			DIGEST: 'digest',
			DIGEST1: 'digest1',
			PRCODE: 0,
			SRCODE: 0,
			ORDERNUMBER: 52,
		})

		const response = await request.get(`${endpoint}/?${queryParams}`)
			.set('Content-Type', 'application/json')
			.send()

		const order = await OrderModel.findOne({
			where: {
				orderNumber: {
					[Op.eq]: 52
				}
			},
			include: {
				association: 'paymentOrder',
				include: [{ association: 'paymentResponse' }]
			}
		})

		let parsedUrl = url.parse(response.headers.location);
		let parsedQs = queryString.parse(parsedUrl.query);

		expect(Boolean(parsedQs.success)).toBe(true)
		expect(parsedQs.orderId).toBe(order.id)
		expect(parsedQs.orderAccessToken).toBeTruthy()
		expect(order.state).toBe(ORDER_STATE.PAID)

		expect(order.paymentOrder.paymentResponse.isVerified).toBe(true)
		expect(order.paymentOrder.paymentResponse.isSuccess).toBe(true)

		verifySignatureMock.mockRestore();
	})

})
