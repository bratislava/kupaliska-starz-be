import { Router } from 'express'

import OrderRouter from './orders'
import UsersRouter from './users'
import SwimmingPoolsRouter from './swimmingPools'
import TicketTypesRouter from './ticketTypes'
import ContactRouter from './contact'

const router = Router()

export default () => {
	router.use('/orders', OrderRouter())
	router.use('/users', UsersRouter())
	router.use('/swimmingPools', SwimmingPoolsRouter())
	router.use('/ticketTypes', TicketTypesRouter())
	router.use('/contact', ContactRouter())

	return router
}
