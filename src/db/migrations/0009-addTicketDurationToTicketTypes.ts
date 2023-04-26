import { QueryInterface, DataTypes } from 'sequelize'
import { checkTableExists } from '../../utils/helpers'
export async function up(queryInterface: QueryInterface) {
	try {
		const exists = await checkTableExists(queryInterface, 'ticketTypes')

		if (!exists) {
			return Promise.resolve()
		}

		const table: any = await queryInterface.describeTable('ticketTypes')
		if (!table.ticketDuration) {
			await queryInterface.addColumn('ticketTypes', 'ticketDuration', {
				type: DataTypes.TIME,
				allowNull: true,
			})
		}

		return Promise.resolve()
	} catch (err) {
		throw err
	}
}

export async function down(queryInterface: QueryInterface) {
	const table: any = await queryInterface.describeTable('ticketTypes')
	if (table.ticketDuration) {
		await queryInterface.removeColumn('ticketTypes', 'ticketDuration')
	}

	return Promise.resolve()
}
