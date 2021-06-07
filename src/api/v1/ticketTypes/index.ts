import { Router } from 'express'
import schemaMiddleware from '../../../middlewares/schemaMiddleware'

import * as GetTicketType from './get.ticketType'
import * as GetTicketTypes from './get.ticketTypes'

const router: Router = Router()

export default () => router
router.get('/',
	schemaMiddleware(GetTicketTypes.schema),
	GetTicketTypes.workflow)

router.get('/:ticketTypeId',
	schemaMiddleware(GetTicketType.schema),
	GetTicketType.workflow)

