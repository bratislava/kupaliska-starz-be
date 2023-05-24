import { Router } from 'express'
import { Request, Response, NextFunction } from 'express'
import * as PostOrder from './post.order'
import * as GetDiscountCode from './get.discountCode'
import * as GetSuccessfulOrder from './get.successfulOrder'
import * as GetPostPaymentResponse from './get.post.paymentResponse'
import * as GetLoggedUserTickets from './get.loggedUserTickets'
import * as GetAppleWallet from './get.appleWallet'
import passport from 'passport'
import schemaMiddleware from '../../../middlewares/schemaMiddleware'
import recaptchaMiddleware from '../../../middlewares/recaptchaMiddleware'

const router = Router()

export default () => {
	router.get(
		'/discountCodes/:code/ticketTypes/:ticketTypeId',
		schemaMiddleware(GetDiscountCode.schema),
		GetDiscountCode.workflow
	)

	router.post(
		'/',
		passport.authenticate('jwt-cognito'),
		recaptchaMiddleware,
		schemaMiddleware(PostOrder.schema),
		(req: Request, res: Response, next: NextFunction) => {
			PostOrder.workflow(req, res, next, true)
		}
	)

	router.post(
		'/unauthenticated',
		recaptchaMiddleware,
		schemaMiddleware(PostOrder.schema),
		(req: Request, res: Response, next: NextFunction) => {
			PostOrder.workflow(req, res, next, false)
		}
	)

	router.get(
		'/tickets',
		passport.authenticate('jwt-cognito'),
		GetLoggedUserTickets.workflow
	)

	router.post(
		'/getPrice',
		passport.authenticate('jwt-cognito'),
		schemaMiddleware(PostOrder.schema),
		(req: Request, res: Response, next: NextFunction) => {
			PostOrder.workflowDryRun(req, res, next, true)
		}
	)

	router.post(
		'/getPrice/unauthenticated',
		schemaMiddleware(PostOrder.schema),
		(req: Request, res: Response, next: NextFunction) => {
			PostOrder.workflowDryRun(req, res, next, false)
		}
	)

	router.get(
		'/:orderId/successful',
		passport.authenticate('jwt-order-response'),
		schemaMiddleware(GetSuccessfulOrder.schema),
		GetSuccessfulOrder.workflow
	)

	router.get(
		'/webpay/response',
		schemaMiddleware(GetPostPaymentResponse.schema),
		GetPostPaymentResponse.workflow
	)

	router.post(
		'/webpay/response',
		schemaMiddleware(GetPostPaymentResponse.schema),
		GetPostPaymentResponse.workflow
	)

	// didn't find a better place to put this (/tickets ?), therefore under /orders
	router.get('/appleWallet/:ticketId', GetAppleWallet.workflow)

	return router
}
