import { QueryInterface, DataTypes } from 'sequelize'
import { checkTableExists } from '../../utils/helpers'

export async function up(queryInterface: QueryInterface) {
	try {
		const exists = await checkTableExists(queryInterface, 'tickets')

		if (!exists) {
			return Promise.resolve()
		}

		const table: any = await queryInterface.describeTable('tickets')

		if (!table.priceWithVat) {
			await queryInterface.renameColumn(
				'tickets',
				'price',
				'priceWithVat'
			)
		}
		if (!table.vatPercentage) {
			await queryInterface.addColumn('tickets', 'vatPercentage', {
				type: DataTypes.DECIMAL(10, 2),
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

	if (table.priceWithVat) {
		await queryInterface.renameColumn('tickets', 'priceWithVat', 'price')
	}
	if (table.vatPercentage) {
		await queryInterface.removeColumn('tickets', 'vatPercentage')
	}
	return Promise.resolve()
}
