import passport from 'passport'
import { Router } from 'express'
import schemaMiddleware from '../../../middlewares/schemaMiddleware'
import authorizationMiddleware from '../../../middlewares/authorizationMiddleware'
import { USER_ROLE } from '../../../utils/enums'

import * as GetOrders from './get.orders'
import * as GetOrdersSummary from './get.ordersSummary'
import * as PatchOrder from './patch.order'
import * as PostResendOrderEmail from './post.resendEmail'

const router: Router = Router()

export default () => router
	router.get('/',
		passport.authenticate('jwt'),
		authorizationMiddleware([USER_ROLE.OPERATOR, USER_ROLE.SUPER_ADMIN]),
		schemaMiddleware(GetOrders.schema),
		GetOrders.workflow)

	router.get('/summary',
		passport.authenticate('jwt'),
		authorizationMiddleware([USER_ROLE.OPERATOR, USER_ROLE.SUPER_ADMIN]),
		schemaMiddleware(GetOrdersSummary.schema),
		GetOrdersSummary.workflow)

	router.patch('/:orderId',
		passport.authenticate('jwt'),
		authorizationMiddleware([USER_ROLE.OPERATOR, USER_ROLE.SUPER_ADMIN]),
		schemaMiddleware(PatchOrder.schema),
		PatchOrder.workflow)

	router.post('/:orderId/resend',
		passport.authenticate('jwt'),
		authorizationMiddleware([USER_ROLE.OPERATOR, USER_ROLE.SUPER_ADMIN]),
		schemaMiddleware(PostResendOrderEmail.schema),
		PostResendOrderEmail.workflow)


