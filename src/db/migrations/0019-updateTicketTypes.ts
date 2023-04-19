import { QueryInterface, DataTypes } from 'sequelize'
import { checkTableExists } from '../../utils/helpers'
export async function up(queryInterface: QueryInterface) {
	try {
		const exists = await checkTableExists(queryInterface, 'ticketTypes')

		if (!exists) {
			return Promise.resolve()
		}

		const table: any = await queryInterface.describeTable('ticketTypes')
		if (!table.hasEntranceConstraints) {
			await queryInterface.addColumn(
				'ticketTypes',
				'hasEntranceConstraints',
				{
					type: DataTypes.BOOLEAN,
					allowNull: false,
					defaultValue: false,
				}
			)
		}

		if (!table.hasTicketDuration) {
			await queryInterface.addColumn('ticketTypes', 'hasTicketDuration', {
				type: DataTypes.BOOLEAN,
				allowNull: false,
				defaultValue: false,
			})
		}

		if (!table.entranceTo) {
			await queryInterface.addColumn('ticketTypes', 'entranceTo', {
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
	if (table.hasEntranceConstraints) {
		await queryInterface.removeColumn(
			'ticketTypes',
			'hasEntranceConstraints'
		)
	}

	if (table.hasTicketDuration) {
		await queryInterface.removeColumn('ticketTypes', 'hasTicketDuration')
	}

	if (table.entranceTo) {
		await queryInterface.removeColumn('ticketTypes', 'entranceTo')
	}

	return Promise.resolve()
}
