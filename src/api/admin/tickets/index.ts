import passport from 'passport'
import { Router } from 'express'
import schemaMiddleware from '../../../middlewares/schemaMiddleware'
import authorizationMiddleware from '../../../middlewares/authorizationMiddleware'
import { USER_ROLE } from '../../../utils/enums'

import * as GetTicketScan from './get.ticket.scan'
import * as GetTickets from './get.tickets'
import * as GetTicketsSummary from './get.ticketsSummary'
import * as GetTicketsSales from './get.ticketsSales'
import * as PostTicketCheckin from './post.ticket.checkin'
import * as PostTicketCheckout from './post.ticket.checkout'

import swimmingPoolAuthorizationMiddleware from '../../../middlewares/swimmingPoolAuthorizationMiddleware'
import { validateTicketMiddleware } from '../../../passport/jwtVerify'

const router: Router = Router()

export default () => router

router.get(
	'/swimmingPools/:swimmingPoolId/scan/:ticketId',
	passport.authenticate('jwt'),
	authorizationMiddleware([
		USER_ROLE.SWIMMING_POOL_EMPLOYEE,
		USER_ROLE.SWIMMING_POOL_OPERATOR,
		USER_ROLE.OPERATOR,
		USER_ROLE.SUPER_ADMIN,
	]),
	swimmingPoolAuthorizationMiddleware(),
	schemaMiddleware(GetTicketScan.schema),
	GetTicketScan.workflow
)

router.post(
	'/swimmingPools/:swimmingPoolId/checkin/:ticketId',
	passport.authenticate('jwt'),
	authorizationMiddleware([
		USER_ROLE.SWIMMING_POOL_EMPLOYEE,
		USER_ROLE.SWIMMING_POOL_OPERATOR,
		USER_ROLE.OPERATOR,
		USER_ROLE.SUPER_ADMIN,
	]),
	swimmingPoolAuthorizationMiddleware(),
	schemaMiddleware(PostTicketCheckin.schema),
	PostTicketCheckin.workflow
)

router.post(
	'/swimmingPools/:swimmingPoolId/checkout/:ticketId',
	passport.authenticate('jwt'),
	authorizationMiddleware([
		USER_ROLE.SWIMMING_POOL_EMPLOYEE,
		USER_ROLE.SWIMMING_POOL_OPERATOR,
		USER_ROLE.OPERATOR,
		USER_ROLE.SUPER_ADMIN,
	]),
	swimmingPoolAuthorizationMiddleware(),
	schemaMiddleware(PostTicketCheckout.schema),
	PostTicketCheckout.workflow
)

router.get(
	'/swimmingPools/:swimmingPoolId',
	passport.authenticate('jwt'),
	authorizationMiddleware([
		USER_ROLE.SWIMMING_POOL_OPERATOR,
		USER_ROLE.OPERATOR,
		USER_ROLE.SUPER_ADMIN,
	]),
	swimmingPoolAuthorizationMiddleware(),
	schemaMiddleware(GetTickets.schema),
	GetTickets.workflow
)

router.get(
	'/swimmingPools/:swimmingPoolId/summary',
	passport.authenticate('jwt'),
	authorizationMiddleware([
		USER_ROLE.SWIMMING_POOL_OPERATOR,
		USER_ROLE.OPERATOR,
		USER_ROLE.SUPER_ADMIN,
	]),
	swimmingPoolAuthorizationMiddleware(),
	schemaMiddleware(GetTicketsSummary.schema),
	GetTicketsSummary.workflow
)

router.get(
	'/sales',
	passport.authenticate('jwt'),
	authorizationMiddleware([
		USER_ROLE.SWIMMING_POOL_OPERATOR,
		USER_ROLE.OPERATOR,
		USER_ROLE.SUPER_ADMIN,
	]),
	swimmingPoolAuthorizationMiddleware('query'),
	schemaMiddleware(GetTicketsSales.schema),
	GetTicketsSales.workflow
)
