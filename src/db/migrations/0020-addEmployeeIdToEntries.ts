import { QueryInterface, DataTypes } from 'sequelize'
import { checkTableExists } from '../../utils/helpers'
export async function up(queryInterface: QueryInterface) {
	try {
		const exists = await checkTableExists(queryInterface, 'entries')

		if (!exists) {
			return Promise.resolve()
		}

		const table: any = await queryInterface.describeTable('entries')
		if (!table.employeeId) {
			await queryInterface.addColumn(
				'entries',
				'employeeId',
				{
					type: DataTypes.UUID,
					references: {
						model: "users",
						key: "id"
					},
					allowNull: false
				},
			)
		}

		return Promise.resolve()

	} catch (err) {
		throw err;
	}
}

export async function down(queryInterface: QueryInterface) {
	const table: any = await queryInterface.describeTable('entries')
	if (table.employeeId) {
		await queryInterface.removeColumn(
			'entries',
			'employeeId'
		)
	}

	return Promise.resolve()
}
