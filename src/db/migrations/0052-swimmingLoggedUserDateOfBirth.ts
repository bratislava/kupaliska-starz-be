import { QueryInterface, DataTypes } from 'sequelize'
import { checkTableExists } from '../../utils/helpers'
export async function up(queryInterface: QueryInterface) {
	try {
		const exists = await checkTableExists(
			queryInterface,
			'swimmingLoggedUsers'
		)

		if (!exists) {
			return Promise.resolve()
		}

		const table: any = await queryInterface.describeTable(
			'swimmingLoggedUsers'
		)

		if (!table.dateOfBirth) {
			await queryInterface.addColumn(
				'swimmingLoggedUsers',
				'dateOfBirth',
				{
					type: DataTypes.DATE(),
					allowNull: true,
				}
			)
		}

		return Promise.resolve()
	} catch (err) {
		throw err
	}
}

export async function down(queryInterface: QueryInterface) {
	const table: any = await queryInterface.describeTable('swimmingLoggedUsers')

	if (table.dateOfBirth) {
		await queryInterface.removeColumn('swimmingLoggedUsers', 'dateOfBirth')
	}

	return Promise.resolve()
}
