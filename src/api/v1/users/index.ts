import passport from 'passport'
import { Router } from 'express'
import schemaMiddleware from '../../../middlewares/schemaMiddleware'

import * as PostSendResetPasswordEmail from './post.sendResetPasswordEmail'
import * as PutResetPassword from './put.resetPassword'
import * as PutChangePassword from './put.changePassword'

const router: Router = Router()

export default () => router
router.post('/sendResetPasswordEmail',
	schemaMiddleware(PostSendResetPasswordEmail.schema),
	PostSendResetPasswordEmail.workflow)

router.put('/resetPassword',
	passport.authenticate('jwt-reset-password'),
	schemaMiddleware(PutResetPassword.schema),
	PutResetPassword.workflow)

router.put('/changePassword',
	passport.authenticate('jwt'),
	schemaMiddleware(PutChangePassword.schema),
	PutChangePassword.workflow)

