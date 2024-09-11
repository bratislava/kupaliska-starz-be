import { Router } from 'express'
import schemaMiddleware from '../../../middlewares/schemaMiddleware'

import * as GetGeneralInformation from './get.generalInformation'

const router: Router = Router()

export default () => router
router.get(
	'/',
	schemaMiddleware(GetGeneralInformation.schema),
	GetGeneralInformation.workflow
)
