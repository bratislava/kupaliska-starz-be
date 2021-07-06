import faker from 'faker'
import { QueryInterface } from 'sequelize'

export async function up(queryInterface: QueryInterface) {
	await queryInterface.bulkInsert('ticketTypes', [
		// SEASONAL, NAME REQUIRED
		{
			id: 'c70954c7-970d-4f1a-acf4-12b91acabe02',
			name: 'Sezónny tiket',
			description: faker.lorem.paragraph(15),
			price: 0.8,
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
			id: 'c70954c7-970d-4f1a-acf4-12b91acabe03',
			name: 'Sezónny tiket',
			description: faker.lorem.paragraph(15),
			price: 20,
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
			id: 'c70954c7-970d-4f1a-acf4-12b91acabe04',
			name: 'Sezónny tiket',
			description: faker.lorem.paragraph(15),
			price: 20,
			type: 'SEASONAL',
			nameRequired: false,
			photoRequired: false,
			childrenAllowed: true,
			childrenMaxNumber: 2,
			childrenAgeFrom: 3,
			childrenAgeTo: 17,
			childrenPrice: 1,
			childrenAgeToWithAdult: 10,
			childrenPhotoRequired: false,
			validFrom: '2021-04-12',
			validTo: '2025-07-12',
			hasTicketDuration: false,
			hasEntranceConstraints: false,
		},
		// EXPIRED TICKET
		{
			id: 'c70954c7-970d-4f1a-acf4-12b91acabe05',
			name: 'Sezónny tiket',
			description: faker.lorem.paragraph(15),
			price: 20,
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
			id: 'c70954c7-970d-4f1a-acf4-12b91acabe06',
			name: 'Viacvstupovy tiket',
			description: faker.lorem.paragraph(15),
			price: 39.99,
			type: 'ENTRIES',
			nameRequired: false,
			photoRequired: false,
			childrenAllowed: false,
			entriesNumber: 10,
			validFrom: "2021-05-12",
			validTo: "2021-11-12",
			hasTicketDuration: false,
			hasEntranceConstraints: false,
		},
		// PHOTO TESTS
		{
			id: 'c70954c7-970d-4f1a-acf4-12b91acabe07',
			name: 'Viacvstupovy tiket',
			description: faker.lorem.paragraph(15),
			price: 39.99,
			type: 'ENTRIES',
			nameRequired: false,
			photoRequired: false,
			childrenAllowed: true,
			childrenMaxNumber: 2,
			childrenAgeFrom: 3,
			childrenAgeTo: 18,
			childrenPrice: 1,
			childrenAgeToWithAdult: 10,
			childrenPhotoRequired: false,
			entriesNumber: 10,
			validFrom: "2021-05-12",
			validTo: "2021-11-12",
			hasTicketDuration: false,
			hasEntranceConstraints: false,
		},
	])

}

export async function down(queryInterface: QueryInterface) {
	return await queryInterface.bulkDelete('ticketTypes', undefined)
}
