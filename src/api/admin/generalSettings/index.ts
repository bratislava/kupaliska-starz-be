import passport from 'passport'
import { Router } from 'express'
import schemaMiddleware from '../../../middlewares/schemaMiddleware'
import authorizationMiddleware from '../../../middlewares/authorizationMiddleware'
import { USER_ROLE } from '../../../utils/enums'

import * as PatchGeneralSettings from './patch.generalSettings'

const router: Router = Router()

export default () => router
router.patch(
	'/',
	passport.authenticate('jwt'),
	authorizationMiddleware([USER_ROLE.SUPER_ADMIN]),
	schemaMiddleware(PatchGeneralSettings.schema),
	PatchGeneralSettings.workflow
)
