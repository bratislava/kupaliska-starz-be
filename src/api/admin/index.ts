import { Router } from 'express'

import AuthRouter from './authorization'
import TicketTypesRouter from './ticketTypes'
import UsersRouter from './users'
import SwimmingPoolsRouter from './swimmingPools'
import TicketsRouter from './tickets'
import DiscountCodesRouter from './discountCodes'
import OrdersRouter from './orders'
import CustomersRouter from './customers'
import EntriesRouter from './entries'

const router = Router()

export default () => {
	router.use('/authorization', AuthRouter())
	router.use('/ticketTypes', TicketTypesRouter())
	router.use('/users', UsersRouter())
	router.use('/swimmingPools', SwimmingPoolsRouter())
	router.use('/tickets', TicketsRouter())
	router.use('/discountCodes', DiscountCodesRouter())
	router.use('/orders', OrdersRouter())
	router.use('/customers', CustomersRouter())
	router.use('/entries', EntriesRouter())
	return router
}
