import { QueryInterface, DataTypes } from 'sequelize'
import { checkTableExists } from '../../utils/helpers'

export async function up(queryInterface: QueryInterface) {
	try {
		const exists = await checkTableExists(queryInterface, 'orders')

		if (!exists) {
			return Promise.resolve()
		}

		const table: any = await queryInterface.describeTable('orders')

		if (!table.orderNumberInYear) {
			await queryInterface.addColumn('orders', 'orderNumberInYear', {
				type: DataTypes.BIGINT,
				allowNull: true,
			})
			await queryInterface.addColumn('orders', 'orderPaidInYear', {
				type: DataTypes.INTEGER,
				allowNull: true,
			})
		}
		return Promise.resolve()
	} catch (err) {
		throw err
	}
}

export async function down(queryInterface: QueryInterface) {
	const table: any = await queryInterface.describeTable('orders')

	if (table.orderNumberInYear) {
		await queryInterface.removeColumn('orders', 'orderNumberInYear')
		await queryInterface.removeColumn('orders', 'orderPaidInYear')
	}

	return Promise.resolve()
}
