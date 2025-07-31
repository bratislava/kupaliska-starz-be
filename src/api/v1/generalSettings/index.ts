import { Router } from 'express'
import schemaMiddleware from '../../../middlewares/schemaMiddleware'

import * as GetGeneralSettings from './get.generalSettings'

const router: Router = Router()

export default () => router
router.get(
	'/',
	schemaMiddleware(GetGeneralSettings.schema),
	GetGeneralSettings.workflow
)
