import { QueryInterface, DataTypes } from 'sequelize'
import { checkTableExists } from '../../utils/helpers'
export async function up(queryInterface: QueryInterface) {
	try {
		const exists = await checkTableExists(queryInterface, 'tickets')

		if (!exists) {
			return Promise.resolve()
		}

		const table: any = await queryInterface.describeTable('tickets')

		if (!table.loggedUserId) {
			await queryInterface.addColumn('tickets', 'loggedUserId', {
				type: DataTypes.UUID,
				allowNull: true,
			})
		}

		if (!table.associatedSwimmerId) {
			await queryInterface.addColumn('tickets', 'associatedSwimmerId', {
				type: DataTypes.UUID,
				allowNull: true,
			})
		}

		return Promise.resolve()
	} catch (err) {
		throw err
	}
}

export async function down(queryInterface: QueryInterface) {
	const table: any = await queryInterface.describeTable('tickets')

	if (table.remainingEntries) {
		await queryInterface.removeColumn('tickets', 'loggedUserId')
	}

	if (table.associatedSwimmerId) {
		await queryInterface.removeColumn('tickets', 'associatedSwimmerId')
	}

	return Promise.resolve()
}
