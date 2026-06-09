import faker from 'faker'
import { QueryInterface } from 'sequelize'

export const ticketId = 'c70954c7-970d-4f1a-acf4-12b91acabe01'
export const ticketTypeSeasonalWithChildren = 'c70954c7-970d-4f1a-acf4-12b91acabe04'
export const ticketTypeSeasonalWithChildren2 = 'c70954c7-970d-4f1a-acf4-12b91acabe08'
export const ticketTypeExpired = 'c70954c7-970d-4f1a-acf4-12b91acabe05'
export const ticketTypeSeasonNameRequired = 'c70954c7-970d-4f1a-acf4-12b91acabe02'
export const ticketTypePhotoRequiredId = 'c70954c7-970d-4f1a-acf4-12b91acabe07'
export const ticket3Id = 'c70954c7-970d-4f1a-acf4-12b91acabe03'
export const ticketTypeEntriesId = 'c70954c7-970d-4f1a-acf4-12b91acabe06'

export async function up(queryInterface: QueryInterface) {
	await queryInterface.bulkInsert('ticketTypes', [
		// SEASONAL, NAME REQUIRED
		{
			id: ticketTypeSeasonNameRequired,
			name: 'Sezónny tiket',
			description: faker.lorem.paragraph(15),
			priceWithVat: 80,
			vatPercentage: 23,
			type: 'SEASONAL',
			nameRequired: true,
			photoRequired: false,
			childrenAllowed: false,
			validFrom: '2021-04-12',
			validTo: '2025-07-12',
			hasTicketDuration: false,
			hasEntranceConstraints: false,
		},
		// SEASONAL, DONT REQUIRE NAME, CHILDREN ARE FORBIDDEN
		{
			id: ticket3Id,
			name: 'Sezónny tiket',
			description: faker.lorem.paragraph(15),
			priceWithVat: 2000,
			vatPercentage: 23,
			type: 'SEASONAL',
			nameRequired: false,
			photoRequired: false,
			childrenAllowed: false,
			validFrom: '2021-04-12',
			validTo: '2025-07-12',
			hasTicketDuration: false,
			hasEntranceConstraints: false,
		},
		// SEASONAL WITH CHILDREN
		{
			id: ticketTypeSeasonalWithChildren,
			name: 'Sezónny tiket',
			description: faker.lorem.paragraph(15),
			priceWithVat: 2000,
			vatPercentage: 23,
			type: 'SEASONAL',
			nameRequired: false,
			photoRequired: false,
			childrenAllowed: true,
			childrenMaxNumber: 2,
			childrenAgeFrom: 3,
			childrenAgeTo: 17,
			childrenPriceWithVat: 100,
			childrenVatPercentage: 23,
			childrenAgeToWithAdult: 10,
			childrenPhotoRequired: false,
			validFrom: '2021-04-12',
			validTo: '2025-07-12',
			hasTicketDuration: false,
			hasEntranceConstraints: false,
		},
		// SEASONAL WITH CHILDREN
		{
			id: ticketTypeSeasonalWithChildren2,
			name: 'Sezónny tiket 2',
			description: faker.lorem.paragraph(15),
			priceWithVat: 2000,
			vatPercentage: 23,
			type: 'SEASONAL',
			nameRequired: false,
			photoRequired: false,
			childrenAllowed: true,
			childrenMaxNumber: 2,
			childrenAgeFrom: 3,
			childrenAgeTo: 17,
			childrenPriceWithVat: 100,
			childrenVatPercentage: 23,
			childrenAgeToWithAdult: 10,
			childrenPhotoRequired: false,
			validFrom: '2021-04-12',
			validTo: '2025-07-12',
			hasTicketDuration: false,
			hasEntranceConstraints: false,
		},
		// EXPIRED TICKET
		{
			id: ticketTypeExpired,
			name: 'Sezónny tiket',
			description: faker.lorem.paragraph(15),
			priceWithVat: 20,
			vatPercentage: 23,
			type: 'SEASONAL',
			nameRequired: false,
			photoRequired: false,
			childrenAllowed: false,
			validFrom: '2021-02-02',
			validTo: '2021-03-03',
			hasTicketDuration: false,
			hasEntranceConstraints: false,
		},
		// ENTRIES TICKET
		{
			id: ticketTypeEntriesId,
			name: 'Viacvstupovy tiket',
			description: faker.lorem.paragraph(15),
			priceWithVat: 3999,
			vatPercentage: 23,
			type: 'ENTRIES',
			nameRequired: false,
			photoRequired: false,
			childrenAllowed: false,
			entriesNumber: 10,
			validFrom: '2021-05-12',
			validTo: '2021-11-12',
			hasTicketDuration: false,
			hasEntranceConstraints: false,
		},
		// PHOTO TESTS
		{
			id: ticketTypePhotoRequiredId,
			name: 'Viacvstupovy tiket',
			description: faker.lorem.paragraph(15),
			priceWithVat: 3999,
			vatPercentage: 23,
			type: 'ENTRIES',
			nameRequired: false,
			photoRequired: false,
			childrenAllowed: true,
			childrenMaxNumber: 2,
			childrenAgeFrom: 3,
			childrenAgeTo: 18,
			childrenPriceWithVat: 100,
			childrenVatPercentage: 23,
			childrenAgeToWithAdult: 10,
			childrenPhotoRequired: false,
			entriesNumber: 10,
			validFrom: '2021-05-12',
			validTo: '2021-11-12',
			hasTicketDuration: false,
			hasEntranceConstraints: false,
		},
	])
}

export async function down(queryInterface: QueryInterface) {
	return await queryInterface.bulkDelete('ticketTypes', undefined)
}
