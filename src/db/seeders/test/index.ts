import { up as users } from './00-users'
import { up as ticketTypes } from './01-ticketTypes'
import { up as swimmingPools } from './02-swimmingPools'
import { up as tickets } from './03-tickets'
import { up as orders } from './04-orders'

export const up = () => Promise.resolve()
export const down = () => Promise.resolve()

export const seedsUp =  [
	users,
	ticketTypes,
	swimmingPools,
	tickets,
	orders
]
