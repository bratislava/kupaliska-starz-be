import { Router } from 'express'

import schemaMiddleware from '../../../middlewares/schemaMiddleware'

import * as GetSwimmingLoggedUsers from './get.swimmingLoggedUsers'
import * as GetRegisterSwimmingLoggedUsers from './get.registerSwimmingLoggedUsers'
import * as PutSwimmingLoggedUsers from './put.swimmingLoggedUsers'

const router: Router = Router()

export default () => router

router.get(
	'/',
	schemaMiddleware(GetSwimmingLoggedUsers.schema),
	GetSwimmingLoggedUsers.workflow
)

router.put(
	'/',
	schemaMiddleware(PutSwimmingLoggedUsers.schema),
	PutSwimmingLoggedUsers.workflow
)

router.get(
	'/register',
	schemaMiddleware(GetRegisterSwimmingLoggedUsers.schema),
	GetRegisterSwimmingLoggedUsers.workflow
)
