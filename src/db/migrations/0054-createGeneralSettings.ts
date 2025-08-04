import { QueryInterface } from 'sequelize'
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

		await queryInterface.renameTable(
			'generalInformations',
			'generalSettings',
			{
				transaction,
			}
		)

		await transaction.commit()
	} catch (err) {
		await transaction.rollback()
		throw err
	}
}

export async function down(queryInterface: QueryInterface) {
	const transaction = await DB.transaction()
	try {
		const exists = await queryInterface.tableExists('generalSettings', {
			transaction,
		})

		if (!exists) {
			await transaction.rollback()
			return
		}

		await queryInterface.renameTable(
			'generalSettings',
			'generalInformations',
			{
				transaction,
			}
		)

		await transaction.commit()
	} catch (err) {
		await transaction.rollback()
		throw err
	}
}
