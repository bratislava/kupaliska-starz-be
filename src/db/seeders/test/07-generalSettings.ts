import { QueryInterface } from 'sequelize'
import { v4 as uuidv4 } from 'uuid'

export async function up(queryInterface: QueryInterface) {
	await queryInterface.bulkInsert('generalSettings', [
		{
			id: uuidv4(),
			alertText: 'test',
			alertTextColor: '#000000',
			alertColor: '#000000',
			seasonTitle: 'test',
			seasonSubtitle: 'test',
			isOffSeason: false,
			offSeasonTitle: 'test',
			offSeasonSubtitle: 'test',
			showAlert: false,
		},
	])
}

export async function down(queryInterface: QueryInterface) {
	return queryInterface.bulkDelete('generalSettings', undefined)
}
