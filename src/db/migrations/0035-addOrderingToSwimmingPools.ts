import { QueryInterface, DataTypes } from 'sequelize'
import { checkTableExists } from '../../utils/helpers'
export async function up(queryInterface: QueryInterface) {
	try {
		const exists = await checkTableExists(queryInterface, 'swimmingPools')

		if (!exists) {
			return Promise.resolve()
		}

		const table: any = await queryInterface.describeTable('swimmingPools')
		if (!table.ordering) {
			await queryInterface.addColumn(
				'swimmingPools',
				'ordering',
				{
					type: DataTypes.SMALLINT,
					allowNull: false,
					defaultValue: 0
				},
			)
		}
		return Promise.resolve()

	} catch (err) {
		throw err;
	}
}

export async function down(queryInterface: QueryInterface) {
	const table: any = await queryInterface.describeTable('swimmingPools')
	if (table.ordering) {
		await queryInterface.removeColumn(
			'swimmingPools',
			'ordering'
		)
	}

	return Promise.resolve()
}
