import { QueryInterface, DataTypes } from 'sequelize'
import { checkTableExists } from '../../utils/helpers'

export async function up(queryInterface: QueryInterface) {
	try {
		const exists = await checkTableExists(queryInterface, 'ticketTypes')

		if (!exists) {
			return Promise.resolve()
		}

		const table: any = await queryInterface.describeTable('ticketTypes')

		if (!table.isSeniorIsDisabled) {
			await queryInterface.addColumn(
				'ticketTypes',
				'isSeniorIsDisabled',
				{
					type: DataTypes.BOOLEAN,
					defaultValue: false,
					allowNull: false,
				}
			)
		}

		return Promise.resolve()
	} catch (err) {
		throw err
	}
}

export async function down(queryInterface: QueryInterface) {
	const table: any = await queryInterface.describeTable('ticketTypes')

	if (table.isSeniorIsDisabled) {
		await queryInterface.removeColumn('ticketTypes', 'isSeniorIsDisabled')
	}

	return Promise.resolve()
}
