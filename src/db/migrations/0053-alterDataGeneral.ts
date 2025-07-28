import { QueryInterface, DataTypes, Transaction } from 'sequelize'
import { checkTableExists } from '../../utils/helpers'
import DB from '../../db/models'

export async function up(queryInterface: QueryInterface) {
	const transaction = await DB.transaction()

	try {
		const exists = await checkTableExists(
			queryInterface,
			'generalInformations'
		)

		if (!exists) {
			return Promise.resolve()
		}
		const table = await queryInterface.describeTable('generalInformations')

		queryInterface.changeColumn(
			'generalInformations',
			'alertText',
			{
				type: DataTypes.STRING(255),
				allowNull: true,
			},
			{ transaction }
		)

		if (!table.showAlert) {
			await queryInterface.addColumn(
				'generalInformations',
				'showAlert',
				{
					type: DataTypes.BOOLEAN,
					allowNull: false,
					defaultValue: false,
				},
				{ transaction }
			)
		}

		await transaction.commit()

		return Promise.resolve()
	} catch (err) {
		if (transaction) {
			await transaction.rollback()
		}
		throw err
	}
}

export async function down(queryInterface: QueryInterface) {
	const transaction = await DB.transaction()

	try {
		queryInterface.changeColumn(
			'generalInformations',
			'alertText',
			{
				type: DataTypes.STRING(255),
				allowNull: false,
			},
			{ transaction }
		)

		const table = await queryInterface.describeTable('generalInformations')

		if (table.showAlert) {
			await queryInterface.removeColumn(
				'generalInformations',
				'showAlert',
				{
					transaction,
				}
			)
		}

		await transaction.commit()

		return Promise.resolve()
	} catch (err) {
		if (transaction) {
			await transaction.rollback()
		}
		throw err
	}
}
