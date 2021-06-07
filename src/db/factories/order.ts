import faker from 'faker';
import { v4 as uuidv4 } from 'uuid';
import { ORDER_STATE } from '../../utils/enums';

export const createOrder = (orderId = uuidv4()) => ({
	id: orderId,
	price: faker.commerce.price(1, 10000, 2),
	state: ORDER_STATE.CREATED,
	paymentOrder: {
		paymentAmount: 3.99,
	}
})

export const createPaidOrder = (orderId = uuidv4()) => ({
	id: orderId,
	price: faker.commerce.price(1, 10000, 2),
	state: ORDER_STATE.PAID,
	paymentOrder: {
		paymentAmount: faker.commerce.price(1, 10000, 2),
		paymentResponse: {
			data: '',
			isVerified: true,
			isSuccess: true,
		}
	}
})

export const createFailedOrder = (orderId = uuidv4()) => ({
	id: orderId,
	price: faker.commerce.price(1, 10000, 2),
	state: ORDER_STATE.FAILED,
	paymentOrder: {
		paymentAmount: faker.commerce.price(1, 10000, 2),
	}
})

export const createCanceledOrder = (orderId = uuidv4()) => ({
	id: orderId,
	price: faker.commerce.price(1, 10000, 2),
	state: ORDER_STATE.CANCELED,
	paymentOrder: {
		paymentAmount: faker.commerce.price(1, 10000, 2),
	}
})
