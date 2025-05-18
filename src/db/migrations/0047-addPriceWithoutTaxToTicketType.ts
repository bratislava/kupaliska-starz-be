import { QueryInterface, DataTypes } from 'sequelize'
import { checkTableExists } from '../../utils/helpers'

export async function up(queryInterface: QueryInterface) {
	try {
		const exists = await checkTableExists(queryInterface, 'ticketTypes')

		if (!exists) {
			return Promise.resolve()
		}

		const table: any = await queryInterface.describeTable('ticketTypes')

		if (!table.priceWithTax) {
			await queryInterface.renameColumn(
				'ticketTypes',
				'price',
				'priceWithTax'
			)
			await queryInterface.changeColumn('ticketTypes', 'priceWithTax', {
				type: DataTypes.DECIMAL(18, 10),
			})
		}
		if (!table.priceWithoutTax) {
			await queryInterface.addColumn('ticketTypes', 'priceWithoutTax', {
				type: DataTypes.DECIMAL(18, 10),
				allowNull: true,
			})
		}
		if (!table.priceTax) {
			await queryInterface.addColumn('ticketTypes', 'priceTax', {
				type: DataTypes.DECIMAL(18, 10),
				allowNull: true,
			})
		}

		if (!table.childrenPriceWithTax) {
			await queryInterface.renameColumn(
				'ticketTypes',
				'childrenPrice',
				'childrenPriceWithTax'
			)
			await queryInterface.changeColumn(
				'ticketTypes',
				'childrenPriceWithTax',
				{
					type: DataTypes.DECIMAL(18, 10),
					allowNull: true,
				}
			)
		}
		if (!table.childrenPriceWithoutTax) {
			await queryInterface.addColumn(
				'ticketTypes',
				'childrenPriceWithoutTax',
				{
					type: DataTypes.DECIMAL(18, 10),
					allowNull: true,
				}
			)
		}
		if (!table.childrenPriceTax) {
			await queryInterface.addColumn('ticketTypes', 'childrenPriceTax', {
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
	const table: any = await queryInterface.describeTable('ticketTypes')

	if (table.priceWithTax) {
		await queryInterface.changeColumn('ticketTypes', 'priceWithTax', {
			type: DataTypes.DECIMAL(10, 2),
		})
		await queryInterface.renameColumn(
			'ticketTypes',
			'priceWithTax',
			'price'
		)
	}
	if (table.priceWithoutTax) {
		await queryInterface.removeColumn('ticketTypes', 'priceWithoutTax')
	}
	if (table.priceTax) {
		await queryInterface.removeColumn('ticketTypes', 'priceTax')
	}

	if (table.childrenPriceWithTax) {
		await queryInterface.changeColumn(
			'ticketTypes',
			'childrenPriceWithTax',
			{
				type: DataTypes.DECIMAL(10, 2),
			}
		)
		await queryInterface.renameColumn(
			'ticketTypes',
			'childrenPriceWithTax',
			'childrenPrice'
		)
	}
	if (table.priceWithoutTax) {
		await queryInterface.removeColumn(
			'ticketTypes',
			'childrenPriceWithoutTax'
		)
	}
	if (table.priceTax) {
		await queryInterface.removeColumn('ticketTypes', 'childrenPriceTax')
	}

	return Promise.resolve()
}
