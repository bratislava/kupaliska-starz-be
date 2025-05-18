import { QueryInterface, DataTypes } from 'sequelize'
import { checkTableExists } from '../../utils/helpers'

export async function up(queryInterface: QueryInterface) {
	try {
		const exists = await checkTableExists(queryInterface, 'tickets')

		if (!exists) {
			return Promise.resolve()
		}

		const table: any = await queryInterface.describeTable('tickets')

		if (!table.priceWithTax) {
			await queryInterface.renameColumn(
				'tickets',
				'price',
				'priceWithTax'
			)
			await queryInterface.changeColumn('tickets', 'priceWithTax', {
				type: DataTypes.DECIMAL(18, 10),
			})
		}
		if (!table.priceWithoutTax) {
			await queryInterface.addColumn('tickets', 'priceWithoutTax', {
				type: DataTypes.DECIMAL(18, 10),
				allowNull: true,
			})
		}
		if (!table.priceTax) {
			await queryInterface.addColumn('tickets', 'priceTax', {
				type: DataTypes.DECIMAL(18, 10),
				allowNull: true,
			})
		}

		return Promise.resolve()
	} catch (err) {
		throw err
	}
}

export async function down(queryInterface: QueryInterface) {
	const table: any = await queryInterface.describeTable('tickets')

	if (table.priceWithTax) {
		await queryInterface.changeColumn('tickets', 'priceWithTax', {
			type: DataTypes.DECIMAL(10, 2),
		})
		await queryInterface.renameColumn('tickets', 'priceWithTax', 'price')
	}
	if (table.priceWithoutTax) {
		await queryInterface.removeColumn('tickets', 'priceWithoutTax')
	}
	if (table.priceTax) {
		await queryInterface.removeColumn('tickets', 'priceTax')
	}

	return Promise.resolve()
}
