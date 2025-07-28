import passport from 'passport'
import { Router } from 'express'
import schemaMiddleware from '../../../middlewares/schemaMiddleware'
import authorizationMiddleware from '../../../middlewares/authorizationMiddleware'
import { USER_ROLE } from '../../../utils/enums'

import * as PatchGeneralInformations from './patch.generalInformations'

const router: Router = Router()

export default () => router
router.patch(
	'/',
	passport.authenticate('jwt'),
	authorizationMiddleware([USER_ROLE.SUPER_ADMIN]),
	schemaMiddleware(PatchGeneralInformations.schema),
	PatchGeneralInformations.workflow
)
