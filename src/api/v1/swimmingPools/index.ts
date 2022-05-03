import { Router } from 'express'
import schemaMiddleware from '../../../middlewares/schemaMiddleware'

import * as GetSwimmingPoolso from './get.swimmingPoolso'
import * as GetSwimmingPools from './get.swimmingPools'
import * as GetSwimmingPool from './get.swimmingPool'

const router: Router = Router()

export default () => router
router.get('/',
	schemaMiddleware(GetSwimmingPools.schema),
	GetSwimmingPools.workflow)

router.get('/register',
	schemaMiddleware(GetSwimmingPoolso.schema),
	GetSwimmingPoolso.workflow)

router.get('/:swimmingPoolId',
	schemaMiddleware(GetSwimmingPool.schema),
	GetSwimmingPool.workflow)
