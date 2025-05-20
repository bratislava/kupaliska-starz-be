import { QueryInterface, DataTypes } from 'sequelize'
import { checkTableExists } from '../../utils/helpers'

export async function up(queryInterface: QueryInterface) {
	try {
		const exists = await checkTableExists(queryInterface, 'ticketTypes')

		if (!exists) {
			return Promise.resolve()
		}

		const table: any = await queryInterface.describeTable('ticketTypes')

		if (!table.priceWithVat) {
			await queryInterface.renameColumn(
				'ticketTypes',
				'price',
				'priceWithVat'
			)
			await queryInterface.addColumn('ticketTypes', 'vatPercentage', {
				type: DataTypes.DECIMAL(10, 2),
			})
		}

		if (!table.childrenPriceWithVat) {
			await queryInterface.renameColumn(
				'ticketTypes',
				'childrenPrice',
				'childrenPriceWithVat'
			)
			await queryInterface.addColumn(
				'ticketTypes',
				'childrenVatPercentage',
				{
					type: DataTypes.DECIMAL(10, 2),
				}
			)
		}
		return Promise.resolve()
	} catch (err) {
		throw err
	}
}

export async function down(queryInterface: QueryInterface) {
	const table: any = await queryInterface.describeTable('ticketTypes')

	if (table.priceWithVat) {
		await queryInterface.renameColumn(
			'ticketTypes',
			'priceWithVat',
			'price'
		)
		await queryInterface.removeColumn('ticketTypes', 'vatPercentage')
	}

	if (table.childrenPriceWithVat) {
		await queryInterface.renameColumn(
			'ticketTypes',
			'childrenPriceWithVat',
			'childrenPrice'
		)
		await queryInterface.removeColumn(
			'ticketTypes',
			'childrenVatPercentage'
		)
	}

	return Promise.resolve()
}
