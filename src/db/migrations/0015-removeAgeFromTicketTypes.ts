import { QueryInterface, DataTypes } from 'sequelize'
import { checkTableExists } from '../../utils/helpers'
export async function up(queryInterface: QueryInterface) {
	try {
		const exists = await checkTableExists(queryInterface, 'ticketTypes')

		if (!exists) {
			return Promise.resolve()
		}

		const table: any = await queryInterface.describeTable('ticketTypes')

		if (table.ageFrom) {
			await queryInterface.removeColumn(
				'ticketTypes',
				'ageFrom',
			)
		}

		if (table.ageTo) {
			await queryInterface.removeColumn(
				'ticketTypes',
				'ageTo',
			)
		}

		return Promise.resolve()

	} catch (err) {
		throw err;
	}
}

export async function down(queryInterface: QueryInterface) {

	await queryInterface.addColumn(
		'ticketTypes',
		'ageFrom',
		{
			type: DataTypes.SMALLINT,
			allowNull: false,
			defaultValue: 0,
		}
	)

	await queryInterface.addColumn(
		'ticketTypes',
		'ageTo',
		{
			type: DataTypes.SMALLINT,
			allowNull: false,
			defaultValue: 100,

		}
	)

	return Promise.resolve()
}
