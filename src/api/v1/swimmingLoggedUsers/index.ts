import { Router } from 'express'

import schemaMiddleware from '../../../middlewares/schemaMiddleware'

import * as GetSwimmingLoggedUsers from './get.swimmingLoggedUsers'
import * as GetCurrentUser from './get.currentUser'
import * as GetRegisterSwimmingLoggedUsers from './get.registerSwimmingLoggedUsers'
import * as PutSwimmingLoggedUsers from './put.swimmingLoggedUsers'
import passport from 'passport'

const router: Router = Router()

export default () => router

router.get(
	'/',
	passport.authenticate('jwt-cognito'),
	schemaMiddleware(GetSwimmingLoggedUsers.schema),
	GetSwimmingLoggedUsers.workflow
)

router.get(
	'/currentUser',
	passport.authenticate('jwt-cognito'),
	schemaMiddleware(GetCurrentUser.schema),
	GetCurrentUser.workflow
)

router.put(
	'/',
	passport.authenticate('jwt-cognito'),
	schemaMiddleware(PutSwimmingLoggedUsers.schema),
	PutSwimmingLoggedUsers.workflow
)

router.get(
	'/register',
	passport.authenticate('jwt-cognito'),
	schemaMiddleware(GetRegisterSwimmingLoggedUsers.schema),
	GetRegisterSwimmingLoggedUsers.workflow
)
