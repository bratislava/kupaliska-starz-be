import { Router } from 'express'
import schemaMiddleware from '../../../middlewares/schemaMiddleware'
import passport from 'passport'

import * as PostLogin from './post.login'
import * as PostLogout from './post.logout'

const router: Router = Router()

export default () => {
	router.post(
		'/login',
		schemaMiddleware(PostLogin.schema),
		PostLogin.workflow
	)

	router.post(
		'/logout',
		passport.authenticate('jwt'),
		schemaMiddleware(PostLogout.schema),
		PostLogout.workflow
	)

	return router
}
