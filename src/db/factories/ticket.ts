import { v4 as uuidv4 } from 'uuid'

export const createTicket = (ticketId = uuidv4()) => ({
	id: ticketId,
	priceWithVat: 3.99,
	vatPercentage: 23,
	isChildren: false,
	remainingEntries: 4,
})

export const createChildrenTicket = (ticketId = uuidv4()) => ({
	id: ticketId,
	priceWithVat: 3.99,
	vatPercentage: 23,
	isChildren: true,
	remainingEntries: 4,
})
