import { QueryInterface, DataTypes } from 'sequelize'
import { checkTableExists } from '../../utils/helpers'
export async function up(queryInterface: QueryInterface) {
	try {
		const exists = await checkTableExists(queryInterface, 'orders')

		if (!exists) {
			return Promise.resolve()
		}

		const table: any = await queryInterface.describeTable('orders')

		if (table.orderNmuber) {
			await queryInterface.changeColumn(
				'orders',
				'orderNmuber',
				{
					type: DataTypes.BIGINT,
					allowNull: false,
					unique: true
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

	if (table.orderNmuber) {
		await queryInterface.changeColumn(
			'orders',
			'orderNmuber',
			{
				type: DataTypes.BIGINT,
				autoIncrement: true,
				allowNull: false,
				unique: true
			}
		)
	}

	return Promise.resolve()
}