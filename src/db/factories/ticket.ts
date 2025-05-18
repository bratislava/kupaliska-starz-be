import { v4 as uuidv4 } from 'uuid'

export const createTicket = (ticketId = uuidv4()) => ({
	id: ticketId,
	priceWithTax: 3.99,
	priceWithoutTax: 3.0723,
	priceTax: 0.9177,
	isChildren: false,
	remainingEntries: 4,
})

export const createChildrenTicket = (ticketId = uuidv4()) => ({
	id: ticketId,
	priceWithTax: 3.99,
	priceWithoutTax: 3.0723,
	priceTax: 0.9177,
	isChildren: true,
	remainingEntries: 4,
})
