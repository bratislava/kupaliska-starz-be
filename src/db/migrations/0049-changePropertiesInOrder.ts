import { QueryInterface, DataTypes } from 'sequelize'
import { checkTableExists } from '../../utils/helpers'

export async function up(queryInterface: QueryInterface) {
	try {
		const exists = await checkTableExists(queryInterface, 'orders')

		if (!exists) {
			return Promise.resolve()
		}

		const table: any = await queryInterface.describeTable('orders')

		if (!table.priceWithVat) {
			await queryInterface.renameColumn('orders', 'price', 'priceWithVat')
		}
		return Promise.resolve()
	} catch (err) {
		throw err
	}
}

export async function down(queryInterface: QueryInterface) {
	const table: any = await queryInterface.describeTable('orders')

	if (table.priceWithVat) {
		await queryInterface.renameColumn('orders', 'priceWithVat', 'price')
	}

	return Promise.resolve()
}
