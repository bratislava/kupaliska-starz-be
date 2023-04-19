import { TICKET_TYPE } from './../../../utils/enums'
import { QueryInterface } from 'sequelize'
import { v4 as uuidv4 } from 'uuid'

export async function up(queryInterface: QueryInterface) {
	const validFrom = '2021-06-05'
	const validTo = '2021-09-30'
	return queryInterface.bulkInsert('ticketTypes', [
		{
			id: uuidv4(),
			name: 'Sezónna permanentka',
			description: `Neobmedzený vstup počas celej sezóny na všetky
			z našich kúpalísk v Bratislave. Možnosť pridať dieťa
			za zvýhodnenú cenu 1€.`,
			price: 99,
			type: TICKET_TYPE.SEASONAL,
			nameRequired: true,
			photoRequired: true,
			childrenAllowed: true,
			childrenMaxNumber: 5,
			childrenPrice: 1,
			childrenAgeFrom: 3,
			childrenAgeTo: 17,
			childrenAgeToWithAdult: 10,
			childrenPhotoRequired: true,
			validFrom: validFrom,
			validTo: validTo,
			hasTicketDuration: false,
			hasEntranceConstraints: false,
		},
		{
			id: uuidv4(),
			name: 'Jednorazový lístok',
			description:
				'Platí na ktoromkoľvek z našich kúpalísk v Bratislave počas celej sezóny.',
			price: 3.99,
			type: TICKET_TYPE.ENTRIES,
			nameRequired: false,
			photoRequired: false,
			childrenAllowed: false,
			entriesNumber: 1,
			validFrom: validFrom,
			validTo: validTo,
			hasTicketDuration: false,
			hasEntranceConstraints: false,
		},
		{
			id: uuidv4(),
			name: 'Permanentka na 10 vstupov',
			description: `Platí na 10 vstupov počas celej sezóny. Možnosť využiť ho na všetkých našich kúpaliskách
			v Bratislave!`,
			price: 34,
			type: TICKET_TYPE.ENTRIES,
			nameRequired: true,
			photoRequired: true,
			childrenAllowed: false,
			entriesNumber: 10,
			validFrom: validFrom,
			validTo: validTo,
			hasTicketDuration: false,
			hasEntranceConstraints: false,
		},
		{
			id: uuidv4(),
			name: 'Permanentka na 10 vstupov po 17:00',
			description: `Platí na 10 vstupov po 17:00 počas celej sezóny. Možnosť využiť ho na všetkých našich kúpaliskách
			v Bratislave!`,
			price: 24,
			type: TICKET_TYPE.ENTRIES,
			nameRequired: true,
			photoRequired: true,
			childrenAllowed: false,
			entriesNumber: 10,
			hasTicketDuration: false,
			hasEntranceConstraints: true,
			entranceFrom: '17:00',
			entranceTo: '23:59',
			validFrom: validFrom,
			validTo: validTo,
		},
	])
}

export async function down(queryInterface: QueryInterface) {
	return queryInterface.bulkDelete('ticketTypes', undefined)
}
