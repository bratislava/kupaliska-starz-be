import { QueryInterface, DataTypes } from 'sequelize'
import { checkTableExists } from '../../utils/helpers'
export async function up(queryInterface: QueryInterface) {
	try {
		const exists = await checkTableExists(queryInterface, 'orders')

		if (!exists) {
			return Promise.resolve()
		}

		const table: any = await queryInterface.describeTable('orders')
		if (!table.discount) {
			await queryInterface.addColumn(
				'orders',
				'discount',
				{
					type: DataTypes.DECIMAL(10, 2),
					allowNull: false,
					defaultValue: 0,
				},
			)
		}

		if (!table.discountCodeId) {
			await queryInterface.addColumn(
				'orders',
				'discountCodeId',
				{
					type: DataTypes.UUID,
					references: {
						model: "discountCodes",
						key: "id"
					},
					allowNull: true
				},
			)
		}

		return Promise.resolve()

	} catch (err) {
		throw err;
	}
}

export async function down(queryInterface: QueryInterface) {
	const table: any = await queryInterface.describeTable('orders')
	if (table.discount) {
		await queryInterface.removeColumn(
			'orders',
			'discount'
		)
	}

	if (table.discountCodeId) {
		await queryInterface.removeColumn(
			'orders',
			'discountCodeId'
		)
	}

	return Promise.resolve()
}
