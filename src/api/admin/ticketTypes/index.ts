import passport from 'passport'
import { Router } from 'express'
import schemaMiddleware from '../../../middlewares/schemaMiddleware'

import * as PostTicketTypes from './post.ticketType'
import * as PutTicketTypes from './put.ticketType'
import * as GetTicketTypes from './get.ticketTypes'
import * as GetTicketType from './get.ticketType'
import * as DeleteTicketTypes from './delete.ticketType'
import authorizationMiddleware from '../../../middlewares/authorizationMiddleware'
import { USER_ROLE } from '../../../utils/enums'

const router: Router = Router()

export default () => {
	router.post(
		'/',
		passport.authenticate('jwt'),
		authorizationMiddleware([USER_ROLE.OPERATOR, USER_ROLE.SUPER_ADMIN]),
		schemaMiddleware(PostTicketTypes.schema),
		PostTicketTypes.workflow
	)

	router.get(
		'/',
		passport.authenticate('jwt'),
		authorizationMiddleware([
			USER_ROLE.OPERATOR,
			USER_ROLE.SUPER_ADMIN,
			USER_ROLE.SWIMMING_POOL_OPERATOR,
		]),
		schemaMiddleware(GetTicketTypes.schema),
		GetTicketTypes.workflow
	)

	router.get(
		'/:ticketTypeId',
		passport.authenticate('jwt'),
		authorizationMiddleware([USER_ROLE.OPERATOR, USER_ROLE.SUPER_ADMIN]),
		schemaMiddleware(GetTicketType.schema),
		GetTicketType.workflow
	)

	router.put(
		'/:ticketTypeId',
		passport.authenticate('jwt'),
		authorizationMiddleware([USER_ROLE.OPERATOR, USER_ROLE.SUPER_ADMIN]),
		schemaMiddleware(PutTicketTypes.schema),
		PutTicketTypes.workflow
	)

	router.delete(
		'/:ticketTypeId',
		passport.authenticate('jwt'),
		authorizationMiddleware([USER_ROLE.OPERATOR, USER_ROLE.SUPER_ADMIN]),
		schemaMiddleware(DeleteTicketTypes.schema),
		DeleteTicketTypes.workflow
	)

	return router
}
