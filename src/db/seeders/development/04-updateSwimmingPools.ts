import { QueryInterface } from 'sequelize'

export async function up(queryInterface: QueryInterface) {
	return queryInterface.bulkUpdate(
		'swimmingPools',
		{
			openingHours: '[]',
		},
		{}
	)
}

export async function down(queryInterface: QueryInterface) {
	return queryInterface.bulkUpdate(
		'swimmingPools',
		{
			openingHours: '[{}]',
		},
		{}
	)
}
