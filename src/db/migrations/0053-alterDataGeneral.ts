import { QueryInterface, DataTypes } from 'sequelize'
import { checkTableExists } from '../../utils/helpers'
import DB from '../../db/models'

export async function up(queryInterface: QueryInterface) {
	const transaction = await DB.transaction()

	try {
		const exists = await queryInterface.tableExists('generalInformations', {
			transaction,
		})

		if (!exists) {
			return
		}
		const table = await queryInterface.describeTable('generalInformations')

		if (table.alertText) {
			await queryInterface.changeColumn(
				'generalInformations',
				'alertText',
				{
					type: DataTypes.STRING(255),
					allowNull: true,
				},
				{ transaction }
			)
		}

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
	} catch (err) {
		await transaction.rollback()
		throw err
	}
}

export async function down(queryInterface: QueryInterface) {
	const transaction = await DB.transaction()

	try {
		const exists = await queryInterface.tableExists('generalInformations', {
			transaction,
		})

		if (!exists) {
			return
		}

		const table = await queryInterface.describeTable('generalInformations')

		if (table.alertText) {
			await queryInterface.changeColumn(
				'generalInformations',
				'alertText',
				{
					type: DataTypes.STRING(255),
					allowNull: false,
				},
				{ transaction }
			)
		}

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
	} catch (err) {
		await transaction.rollback()
		throw err
	}
}
