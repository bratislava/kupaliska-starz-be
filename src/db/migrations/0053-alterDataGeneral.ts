import { QueryInterface, DataTypes } from 'sequelize'
import DB from '../../db/models'

export async function up(queryInterface: QueryInterface) {
	const transaction = await DB.transaction()

	try {
		const exists = await queryInterface.tableExists('generalInformations', {
			transaction,
		})

		if (!exists) {
			await transaction.rollback()
			return
		}
		const table = await queryInterface.describeTable('generalInformations')

		if ('alertText' in table) {
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

		if (!('showAlert' in table)) {
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
			await transaction.rollback()
			return
		}

		const table = await queryInterface.describeTable('generalInformations')

		if ('alertText' in table) {
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

		if ('showAlert' in table) {
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
