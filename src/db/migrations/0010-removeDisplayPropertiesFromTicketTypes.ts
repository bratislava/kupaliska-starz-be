import { QueryInterface, DataTypes } from 'sequelize'
import { checkTableExists } from '../../utils/helpers'
export async function up(queryInterface: QueryInterface) {
	try {
		const exists = await checkTableExists(queryInterface, 'ticketTypes')

		if (!exists) {
			return Promise.resolve()
		}

		const table: any = await queryInterface.describeTable('ticketTypes')

		if (table.displayProperties) {
			await queryInterface.removeColumn(
				'ticketTypes',
				'displayProperties',
			)
		}

		if (table.childrenDisplayProperties) {
			await queryInterface.removeColumn(
				'ticketTypes',
				'childrenDisplayProperties',
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
		'displayProperties',
		{
			type: DataTypes.TEXT,
			allowNull: false,
			defaultValue: ''
		}
	)

	await queryInterface.addColumn(
		'ticketTypes',
		'childrenDisplayProperties',
		{
			type: DataTypes.TEXT,
			allowNull: true,
		}
	)

	return Promise.resolve()
}
