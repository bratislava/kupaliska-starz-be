import passport from 'passport'
import { Router } from 'express'
import schemaMiddleware from '../../../middlewares/schemaMiddleware'
import authorizationMiddleware from '../../../middlewares/authorizationMiddleware'
import { USER_ROLE } from '../../../utils/enums'

import * as PostUser from './post.user'
import * as GetUsers from './get.users'
import * as GetUser from './get.user'
import * as PutUser from './put.user'
import * as PutUserActivate from './put.user.activate'
import * as DeleteUser from './delete.user'

const router: Router = Router()

export default () => router
router.post('/',
	passport.authenticate('jwt'),
	authorizationMiddleware([USER_ROLE.OPERATOR, USER_ROLE.SUPER_ADMIN]),
	schemaMiddleware(PostUser.schema),
	PostUser.workflow)

router.get('/',
	passport.authenticate('jwt'),
	authorizationMiddleware([USER_ROLE.OPERATOR, USER_ROLE.SUPER_ADMIN]),
	schemaMiddleware(GetUsers.schema),
	GetUsers.workflow)

router.get('/:userId',
	passport.authenticate('jwt'),
	authorizationMiddleware([USER_ROLE.OPERATOR, USER_ROLE.SUPER_ADMIN]),
	schemaMiddleware(GetUser.schema),
	GetUser.workflow)

router.put('/:userId',
	passport.authenticate('jwt'),
	authorizationMiddleware([USER_ROLE.OPERATOR, USER_ROLE.SUPER_ADMIN]),
	schemaMiddleware(PutUser.schema),
	PutUser.workflow)

router.put('/:userId/activate',
	passport.authenticate('jwt'),
	authorizationMiddleware([USER_ROLE.OPERATOR, USER_ROLE.SUPER_ADMIN]),
	schemaMiddleware(PutUserActivate.schema),
	PutUserActivate.workflow)

router.delete('/:userId',
	passport.authenticate('jwt'),
	authorizationMiddleware([USER_ROLE.OPERATOR, USER_ROLE.SUPER_ADMIN]),
	schemaMiddleware(DeleteUser.schema),
	DeleteUser.workflow)
