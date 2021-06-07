import passport from 'passport'
import { Router } from 'express'
import schemaMiddleware from '../../../middlewares/schemaMiddleware'
import authorizationMiddleware from '../../../middlewares/authorizationMiddleware'
import { USER_ROLE } from '../../../utils/enums'

import * as GetCustomers from './get.customers'
import * as GetCustomersSummary from './get.customersSummary'

const router: Router = Router()

export default () => router
	router.get('/',
		passport.authenticate('jwt'),
		authorizationMiddleware([USER_ROLE.OPERATOR, USER_ROLE.SUPER_ADMIN]),
		schemaMiddleware(GetCustomers.schema),
		GetCustomers.workflow)

	router.get('/summary',
		passport.authenticate('jwt'),
		authorizationMiddleware([USER_ROLE.OPERATOR, USER_ROLE.SUPER_ADMIN]),
		schemaMiddleware(GetCustomersSummary.schema),
		GetCustomersSummary.workflow)


