import { QueryInterface, DataTypes } from 'sequelize'
import { checkTableExists } from '../../utils/helpers'
export async function up(queryInterface: QueryInterface) {
	try {
		const exists = await checkTableExists(queryInterface, 'tickets')

		if (!exists) {
			return Promise.resolve()
		}

		const table: any = await queryInterface.describeTable('tickets')

		if (!table.remainingEntries) {
			await queryInterface.addColumn(
				'tickets',
				'remainingEntries',
				{
					type: DataTypes.SMALLINT,
					allowNull: true
				}
			)
		}

		return Promise.resolve()

	} catch (err) {
		throw err;
	}
}

export async function down(queryInterface: QueryInterface) {
	const table: any = await queryInterface.describeTable('tickets')

	if (table.remainingEntries) {
		await queryInterface.removeColumn(
			'tickets',
			'remainingEntries'
		)
	}

	return Promise.resolve()
}
