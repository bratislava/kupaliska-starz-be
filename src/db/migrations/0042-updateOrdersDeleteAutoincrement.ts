import { QueryInterface, DataTypes } from 'sequelize'
import { checkTableExists } from '../../utils/helpers'
export async function up(queryInterface: QueryInterface) {
	try {
		const exists = await checkTableExists(queryInterface, 'orders')

		if (!exists) {
			return Promise.resolve()
		}

		const table: any = await queryInterface.describeTable('orders')

		if (table.orderNumber) {
			await queryInterface.changeColumn('orders', 'orderNumber', {
				type: DataTypes.BIGINT,
				autoIncrement: false,
				allowNull: false,
				unique: true,
			})
		}

		return Promise.resolve()
	} catch (err) {
		throw err
	}
}

export async function down(queryInterface: QueryInterface) {
	const table: any = await queryInterface.describeTable('orders')

	if (table.orderNumber) {
		await queryInterface.changeColumn('orders', 'orderNumber', {
			type: DataTypes.BIGINT,
			autoIncrement: false, // TODO migration doesn't work when running tests with value (autoIncrement: true) which is what it should be
			allowNull: false,
			unique: true,
		})
	}

	return Promise.resolve()
}
