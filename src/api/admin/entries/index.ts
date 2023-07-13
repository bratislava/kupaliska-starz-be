import passport from 'passport'
import { Router } from 'express'
import schemaMiddleware from '../../../middlewares/schemaMiddleware'
import authorizationMiddleware from '../../../middlewares/authorizationMiddleware'
import { USER_ROLE } from '../../../utils/enums'

import * as GetEntriesScan from './get.entries'

const router: Router = Router()

export default () => router

router.get(
	'/:ticketId',
	passport.authenticate('jwt'),
	authorizationMiddleware([
		USER_ROLE.SWIMMING_POOL_EMPLOYEE,
		USER_ROLE.SWIMMING_POOL_OPERATOR,
		USER_ROLE.OPERATOR,
		USER_ROLE.SUPER_ADMIN,
	]),
	schemaMiddleware(GetEntriesScan.schema),
	GetEntriesScan.workflow
)
