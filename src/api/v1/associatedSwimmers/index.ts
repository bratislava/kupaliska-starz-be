import { Router } from 'express'

import schemaMiddleware from '../../../middlewares/schemaMiddleware'

import * as GetAssociatedSwimmers from './get.associatedSwimmers'
import * as PostAssociatedSwimmers from './post.associatedSwimmers'
import * as DeleteAssociatedSwimmer from './delete.associatedSwimmer'
import * as PutAssociatedSwimmer from './put.associatedSwimmer'

const router: Router = Router()

export default () => router

router.post(
	'/',
	schemaMiddleware(PostAssociatedSwimmers.schema),
	PostAssociatedSwimmers.workflow
)

router.get(
	'/',
	schemaMiddleware(GetAssociatedSwimmers.schema),
	GetAssociatedSwimmers.workflow
)

router.get(
	'/:userId',
	schemaMiddleware(GetAssociatedSwimmers.schema),
	GetAssociatedSwimmers.workflow
)

router.put(
	'/:associatedSwimmerId',
	schemaMiddleware(PutAssociatedSwimmer.schema),
	PutAssociatedSwimmer.workflow
)

router.delete(
	'/:associatedSwimmerId',
	schemaMiddleware(DeleteAssociatedSwimmer.schema),
	DeleteAssociatedSwimmer.workflow
)
