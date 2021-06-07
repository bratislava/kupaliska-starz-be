import { Router } from 'express'
import * as PostOrder from './post.order'
import * as GetDiscountCode from './get.discountCode'
import * as GetSuccessfulOrder from './get.successfulOrder'
import * as GetPostPaymentResponse from './get.post.paymentResponse'
import passport from 'passport'
import schemaMiddleware from '../../../middlewares/schemaMiddleware'
import recaptchaMiddleware from '../../../middlewares/recaptchaMiddleware'

const router = Router()

export default () => {

	router.get('/discountCodes/:code/ticketTypes/:ticketTypeId',
		schemaMiddleware(GetDiscountCode.schema),
		GetDiscountCode.workflow)

	router.post('/',
		recaptchaMiddleware,
		schemaMiddleware(PostOrder.schema),
		PostOrder.workflow)

	router.get('/:orderId/successful',
		passport.authenticate('jwt-order-response'),
		schemaMiddleware(GetSuccessfulOrder.schema),
		GetSuccessfulOrder.workflow)

	router.get('/webpay/response',
		schemaMiddleware(GetPostPaymentResponse.schema),
		GetPostPaymentResponse.workflow)

	router.post('/webpay/response',
		schemaMiddleware(GetPostPaymentResponse.schema),
		GetPostPaymentResponse.workflow)

	return router
}
