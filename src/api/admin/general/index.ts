import passport from 'passport'
import { Router } from 'express'
import schemaMiddleware from '../../../middlewares/schemaMiddleware'
import authorizationMiddleware from '../../../middlewares/authorizationMiddleware'
import { USER_ROLE } from '../../../utils/enums'

import * as PatchGeneral from './patch.general'

const router: Router = Router()

export default () => router
router.patch(
	'/',
	passport.authenticate('jwt'),
	authorizationMiddleware([USER_ROLE.SUPER_ADMIN, USER_ROLE.BASIC]),
	schemaMiddleware(PatchGeneral.schema),
	PatchGeneral.workflow
)
