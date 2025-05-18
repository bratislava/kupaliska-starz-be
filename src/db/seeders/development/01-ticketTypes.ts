import { QueryInterface } from 'sequelize'
import { v4 as uuidv4 } from 'uuid'

export async function up(queryInterface: QueryInterface) {
	const validFrom = '2021-05-12'
	const validTo = '2021-11-12'
	return queryInterface.bulkInsert('ticketTypes', [
		{
			id: uuidv4(),
			name: 'Sezónna permanentka',
			description: `Neobmedzený vstup počas celej sezóny na všetky
			z našich kúpalísk v Bratislave. Možnosť pridať dieťa
			za zvýhodnenú cenu 1€.`,
			priceWithTax: 99,
			priceWithoutTax: 76.23,
			priceTax: 22.77,
			type: 'SEASONAL',
			nameRequired: true,
			photoRequired: true,
			childrenAllowed: true,
			childrenMaxNumber: 5,
			childrenPriceWithTax: 10,
			childrenPriceWithoutTax: 7.7,
			childrenPriceTax: 2.3,
			childrenAgeFrom: 3,
			childrenAgeTo: 18,
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
			priceWithTax: 3.99,
			priceWithoutTax: 3.0723,
			priceTax: 0.9177,
			type: 'ENTRIES',
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
			priceWithTax: 34,
			priceWithoutTax: 26.18,
			priceTax: 7.82,
			type: 'ENTRIES',
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
			priceWithTax: 24,
			priceWithoutTax: 18.48,
			priceTax: 5.52,
			type: 'ENTRIES',
			nameRequired: true,
			photoRequired: true,
			childrenAllowed: false,
			entriesNumber: 10,
			hasTicketDuration: false,
			hasEntranceConstraints: true,
			entranceFrom: '17:00',
			entranceTo: '24:00',
			validFrom: validFrom,
			validTo: validTo,
		},
		{
			id: uuidv4(),
			name: '2 hodinové vstupy - 5ks',
			description: `Platí na 5 vstupov platných 2 hodiny počas celej sezóny. Možnosť využiť ho na všetkých našich kúpaliskách
			v Bratislave!`,
			priceWithTax: 10,
			priceWithoutTax: 7.7,
			priceTax: 2.3,
			type: 'ENTRIES',
			nameRequired: true,
			photoRequired: true,
			childrenAllowed: false,
			hasTicketDuration: true,
			hasEntranceConstraints: false,
			ticketDuration: '02:00',
			entriesNumber: 5,
			validFrom: validFrom,
			validTo: validTo,
		},
	])
}

export async function down(queryInterface: QueryInterface) {
	return queryInterface.bulkDelete('ticketTypes', undefined)
}
