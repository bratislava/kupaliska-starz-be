import { QueryInterface, DataTypes } from 'sequelize'
import { checkTableExists } from '../../utils/helpers'
export async function up(queryInterface: QueryInterface) {
	try {
		const exists = await checkTableExists(queryInterface, 'discountCodes')

		if (!exists) {
			return Promise.resolve()
		}

		const table: any = await queryInterface.describeTable('discountCodes')
		if (!table.usedAt) {
			await queryInterface.addColumn(
				'discountCodes',
				'usedAt',
				{
					type: DataTypes.DATE,
					allowNull: true,
				},
			)
		}


		return Promise.resolve()

	} catch (err) {
		throw err;
	}
}

export async function down(queryInterface: QueryInterface) {
	const table: any = await queryInterface.describeTable('discountCodes')
	if (table.usedAt) {
		await queryInterface.removeColumn(
			'discountCodes',
			'usedAt'
		)
	}


	return Promise.resolve()
}
