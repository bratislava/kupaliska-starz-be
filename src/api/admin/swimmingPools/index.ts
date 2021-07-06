import passport from 'passport'
import { Router } from 'express'
import schemaMiddleware from '../../../middlewares/schemaMiddleware'

import * as PostSwimmingPool from './post.swimmingPool'
import {
	operatorPatchSchema,
	swimmingPoolOperatorPatchSchema,
	workflow as PutWorkflow
} from './patch.swimmingPool'
import * as GetSwimmingPools from './get.swimmingPools'
import * as GetSwimmingPool from './get.swimmingPool'
import * as DeleteSwimmingPool from './delete.swimmingPool'
import * as GetDailyVisits from './get.dailyVisits'
import * as GetCurrentVisits from './get.currentVisits'
import * as GetAverageVisits from './get.averageVisits'
import * as GetUniqueVisits from './get.uniqueVisits'
import authorizationMiddleware from '../../../middlewares/authorizationMiddleware'
import { USER_ROLE } from '../../../utils/enums'
import conditionalSchemaMiddleware from '../../../middlewares/conditionalSchemaMiddleware'
import swimmingPoolAuthorizationMiddleware from '../../../middlewares/swimmingPoolAuthorizationMiddleware'
const router: Router = Router()
const swimmingPoolId = ':swimmingPoolId'

export default () => {
	router.get(`/averageVisits`,
		passport.authenticate('jwt'),
		authorizationMiddleware([USER_ROLE.OPERATOR, USER_ROLE.SUPER_ADMIN, USER_ROLE.SWIMMING_POOL_OPERATOR]),
		swimmingPoolAuthorizationMiddleware('query'),
		schemaMiddleware(GetAverageVisits.schema),
		GetAverageVisits.workflow)

	router.get(`/uniqueVisits`,
		passport.authenticate('jwt'),
		authorizationMiddleware([USER_ROLE.OPERATOR, USER_ROLE.SUPER_ADMIN, USER_ROLE.SWIMMING_POOL_OPERATOR]),
		swimmingPoolAuthorizationMiddleware('query'),
		schemaMiddleware(GetUniqueVisits.schema),
		GetUniqueVisits.workflow)

	router.post('/',
		passport.authenticate('jwt'),
		authorizationMiddleware([USER_ROLE.OPERATOR, USER_ROLE.SUPER_ADMIN]),
		schemaMiddleware(PostSwimmingPool.schema),
		PostSwimmingPool.workflow)

	router.patch(`/${swimmingPoolId}`,
		passport.authenticate('jwt'),
		authorizationMiddleware([USER_ROLE.OPERATOR, USER_ROLE.SUPER_ADMIN, USER_ROLE.SWIMMING_POOL_OPERATOR]),
		conditionalSchemaMiddleware([
			{ role: USER_ROLE.OPERATOR, schema: operatorPatchSchema},
			{ role: USER_ROLE.SUPER_ADMIN, schema: operatorPatchSchema},
			{ role: USER_ROLE.SWIMMING_POOL_OPERATOR, schema: swimmingPoolOperatorPatchSchema}
		]),
		swimmingPoolAuthorizationMiddleware(),
		PutWorkflow)

	router.get('/',
		passport.authenticate('jwt'),
		authorizationMiddleware([USER_ROLE.OPERATOR, USER_ROLE.SUPER_ADMIN, USER_ROLE.SWIMMING_POOL_OPERATOR]),
		schemaMiddleware(GetSwimmingPools.schema),
		GetSwimmingPools.workflow)

	router.get(`/${swimmingPoolId}`,
		passport.authenticate('jwt'),
		authorizationMiddleware([USER_ROLE.OPERATOR, USER_ROLE.SUPER_ADMIN, USER_ROLE.SWIMMING_POOL_OPERATOR]),
		swimmingPoolAuthorizationMiddleware(),
		schemaMiddleware(GetSwimmingPool.schema),
		GetSwimmingPool.workflow)

	router.delete(`/${swimmingPoolId}`,
		passport.authenticate('jwt'),
		authorizationMiddleware([USER_ROLE.OPERATOR, USER_ROLE.SUPER_ADMIN]),
		schemaMiddleware(DeleteSwimmingPool.schema),
		DeleteSwimmingPool.workflow)

	router.get(`/${swimmingPoolId}/dailyVisits`,
		passport.authenticate('jwt'),
		authorizationMiddleware([USER_ROLE.OPERATOR, USER_ROLE.SUPER_ADMIN, USER_ROLE.SWIMMING_POOL_OPERATOR]),
		swimmingPoolAuthorizationMiddleware(),
		schemaMiddleware(GetDailyVisits.schema),
		GetDailyVisits.workflow)

	router.get(`/${swimmingPoolId}/currentVisits`,
		passport.authenticate('jwt'),
		authorizationMiddleware([
			USER_ROLE.OPERATOR,
			USER_ROLE.SUPER_ADMIN,
			USER_ROLE.SWIMMING_POOL_OPERATOR,
			USER_ROLE.SWIMMING_POOL_EMPLOYEE
		]),
		swimmingPoolAuthorizationMiddleware(),
		schemaMiddleware(GetCurrentVisits.schema),
		GetCurrentVisits.workflow)

	return router
}
