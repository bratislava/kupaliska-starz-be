import { QueryInterface, DataTypes } from 'sequelize'
import { ORDER_STATE } from '../../utils/enums'
import { checkTableExists } from '../../utils/helpers'
export async function up(queryInterface: QueryInterface) {
	try {
		const exists = await checkTableExists(queryInterface, 'orders')

		if (!exists) {
			return Promise.resolve()
		}

		const table: any = await queryInterface.describeTable('orders')
		if (!table.state) {
			await queryInterface.addColumn(
				'orders',
				'state',
				{
					type: DataTypes.STRING(255),
					allowNull: false,
					defaultValue: ORDER_STATE.CREATED
				}
			)
		}

		return Promise.resolve()

	} catch (err) {
		throw err;
	}
}

export async function down(queryInterface: QueryInterface) {
	const table: any = await queryInterface.describeTable('orders')
	if (table.state) {
		await queryInterface.removeColumn(
			'orders',
			'state'
		)
	}

	return Promise.resolve()
}
