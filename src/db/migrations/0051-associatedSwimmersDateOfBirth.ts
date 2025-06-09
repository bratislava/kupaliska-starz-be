import { QueryInterface, DataTypes } from 'sequelize'
import { checkTableExists } from '../../utils/helpers'
export async function up(queryInterface: QueryInterface) {
	try {
		const exists = await checkTableExists(
			queryInterface,
			'associatedSwimmers'
		)

		if (!exists) {
			return Promise.resolve()
		}

		const table: any = await queryInterface.describeTable(
			'associatedSwimmers'
		)

		if (!table.dateOfBirth) {
			await queryInterface.addColumn(
				'associatedSwimmers',
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
	const table: any = await queryInterface.describeTable('associatedSwimmers')

	if (table.dateOfBirth) {
		await queryInterface.removeColumn('associatedSwimmers', 'dateOfBirth')
	}

	return Promise.resolve()
}
