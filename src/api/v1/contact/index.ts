import { Router } from 'express'
import recaptchaMiddleware from '../../../middlewares/recaptchaMiddleware'
import schemaMiddleware from '../../../middlewares/schemaMiddleware'

import * as PostContact from './post.contact'

const router: Router = Router()

export default () => router
router.post(
	'/',
	recaptchaMiddleware,
	schemaMiddleware(PostContact.schema),
	PostContact.workflow
)
