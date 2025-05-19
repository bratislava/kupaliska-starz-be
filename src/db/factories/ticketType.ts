import { TICKET_TYPE } from '../../utils/enums'
import { v4 as uuidv4 } from 'uuid'
import faker from 'faker'

export const createTicketType = (ticketTypeId = uuidv4()) => ({
	id: ticketTypeId,
	name: 'Sezónny tiket',
	description: faker.lorem.paragraph(15),
	priceWithVat: 20,
	vatPercentage: 23,
	type: TICKET_TYPE.SEASONAL,
	nameRequired: true,
	photoRequired: true,
	childrenAllowed: false,
	validFrom: '2021-04-12',
	validTo: '2025-07-12',
	hasTicketDuration: false,
	hasEntranceConstraints: false,
})
