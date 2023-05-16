import { Router } from 'express'
import passport from 'passport'

import schemaMiddleware from '../../../middlewares/schemaMiddleware'

import * as GetAssociatedSwimmers from './get.associatedSwimmers'
import * as PostAssociatedSwimmers from './post.associatedSwimmers'
import * as DeleteAssociatedSwimmer from './delete.associatedSwimmer'
import * as PutAssociatedSwimmer from './put.associatedSwimmer'

const router: Router = Router()

export default () => router

router.post(
	'/',
	passport.authenticate('jwt-cognito'),
	schemaMiddleware(PostAssociatedSwimmers.schema),
	PostAssociatedSwimmers.workflow
)

router.get(
	'/',
	passport.authenticate('jwt-cognito'),
	schemaMiddleware(GetAssociatedSwimmers.schema),
	GetAssociatedSwimmers.workflow
)

router.get(
	'/:userId',
	passport.authenticate('jwt-cognito'),
	schemaMiddleware(GetAssociatedSwimmers.schema),
	GetAssociatedSwimmers.workflow
)

router.put(
	'/:associatedSwimmerId',
	passport.authenticate('jwt-cognito'),
	schemaMiddleware(PutAssociatedSwimmer.schema),
	PutAssociatedSwimmer.workflow
)

router.delete(
	'/:associatedSwimmerId',
	passport.authenticate('jwt-cognito'),
	schemaMiddleware(DeleteAssociatedSwimmer.schema),
	DeleteAssociatedSwimmer.workflow
)
