import { Router } from 'express'

import schemaMiddleware from '../../../middlewares/schemaMiddleware'

import * as GetAssociatedSwimmers from './get.associatedSwimmers'
import * as PostAssociatedSwimmers from './post.associatedSwimmers'

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
