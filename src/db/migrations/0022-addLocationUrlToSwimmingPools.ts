import { QueryInterface, DataTypes } from 'sequelize'
import { checkTableExists } from '../../utils/helpers'
export async function up(queryInterface: QueryInterface) {
	try {
		const exists = await checkTableExists(queryInterface, 'swimmingPools')

		if (!exists) {
			return Promise.resolve()
		}

		const table: any = await queryInterface.describeTable('swimmingPools')
		if (!table.locationUrl) {
			await queryInterface.addColumn('swimmingPools', 'locationUrl', {
				type: DataTypes.STRING(1000),
				allowNull: false,
				defaultValue: '',
			})
		}

		return Promise.resolve()
	} catch (err) {
		throw err
	}
}

export async function down(queryInterface: QueryInterface) {
	const table: any = await queryInterface.describeTable('swimmingPools')
	if (table.locationUrl) {
		await queryInterface.removeColumn('swimmingPools', 'locationUrl')
	}

	return Promise.resolve()
}
