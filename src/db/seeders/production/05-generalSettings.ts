import { QueryInterface } from 'sequelize'
import { v4 as uuidv4 } from 'uuid'
import DB, { models } from '../../models'

const { GeneralSettings } = models

export async function up(queryInterface: QueryInterface) {
	const transaction = await DB.transaction()

	try {
		const exists = await queryInterface.tableExists('generalSettings', {
			transaction,
		})

		if (!exists) {
			await transaction.rollback()
			return
		}

		const generalSettings = await GeneralSettings.findAll()
		if (generalSettings.length > 0) {
			await transaction.rollback()
			return
		}

		await queryInterface.bulkInsert('generalSettings', [
			{
				id: uuidv4(),
				alertText: 'test',
				alertTextColor: '#000000',
				alertColor: '#000000',
				seasonTitle: 'test',
				seasonSubtitle: 'test',
				isOffSeason: false,
				offSeasonTitle: 'test',
				offSeasonSubtitle: 'test',
				showAlert: false,
			},
		])

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

		await queryInterface.bulkDelete('generalSettings', null, {
			transaction,
		})
		await transaction.commit()
	} catch (err) {
		await transaction.rollback()
		throw err
	}
}
