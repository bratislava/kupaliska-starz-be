import { QueryInterface } from 'sequelize'

export async function up(queryInterface: QueryInterface) {
	await queryInterface.bulkInsert('swimmingPools', [
		{
			id: 'c70954c7-970d-4f1a-acf4-12b91acabe01',
			name: 'Delfín',
			description: 'Popis kupaliska delfín.',
			expandedDescription: 'Dlhsí Popis kupaliska delfín.',
			waterTemp: -5,
			maxCapacity: 1000,
			openingHours: '[]',
			facilities: '["changing-room", "food", "playground"]',
			locationUrl: 'https://goo.gl/maps/gvuMM4mYWvtGiRfN8',
		},
	])
}

export async function down(queryInterface: QueryInterface) {
	return await queryInterface.bulkDelete('swimmingPools', undefined)
}
