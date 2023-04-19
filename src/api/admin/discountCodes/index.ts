import passport from 'passport'
import { Router } from 'express'
import schemaMiddleware from '../../../middlewares/schemaMiddleware'

import * as PostDiscountCode from './post.discountCode'
import * as GetDiscountCodes from './get.discountCodes'
import * as GetDiscountCode from './get.discountCode'
import * as DeleteDiscountCode from './delete.discountCode'
import authorizationMiddleware from '../../../middlewares/authorizationMiddleware'
import { USER_ROLE } from '../../../utils/enums'

const router: Router = Router()

export default () => {
	router.post(
		'/',
		passport.authenticate('jwt'),
		authorizationMiddleware([USER_ROLE.SUPER_ADMIN]),
		schemaMiddleware(PostDiscountCode.schema),
		PostDiscountCode.workflow
	)

	router.get(
		'/',
		passport.authenticate('jwt'),
		authorizationMiddleware([USER_ROLE.SUPER_ADMIN]),
		schemaMiddleware(GetDiscountCodes.schema),
		GetDiscountCodes.workflow
	)

	router.get(
		'/:discountCodeId',
		passport.authenticate('jwt'),
		authorizationMiddleware([USER_ROLE.SUPER_ADMIN]),
		schemaMiddleware(GetDiscountCode.schema),
		GetDiscountCode.workflow
	)

	router.delete(
		'/:discountCodeId',
		passport.authenticate('jwt'),
		authorizationMiddleware([USER_ROLE.SUPER_ADMIN]),
		schemaMiddleware(DeleteDiscountCode.schema),
		DeleteDiscountCode.workflow
	)

	return router
}
