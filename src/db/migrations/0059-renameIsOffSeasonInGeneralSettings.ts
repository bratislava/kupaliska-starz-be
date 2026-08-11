import { QueryInterface } from 'sequelize'
import DB from '../models'

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

		await queryInterface.sequelize.query(
			`SELECT pg_advisory_xact_lock(hashtext('migration-0059-rename-is-off-season'))`,
			{
				transaction,
			}
		)

		const table = await queryInterface.describeTable('generalSettings')

		if ('isOffSeason' in table) {
			await queryInterface.renameColumn('generalSettings', 'isOffSeason', 'isSeasonActive', {
				transaction,
			})
			await queryInterface.sequelize.query(
				`UPDATE "generalSettings" SET "isSeasonActive" = NOT "isSeasonActive";`,
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
		const exists = await queryInterface.tableExists('generalSettings', {
			transaction,
		})

		if (!exists) {
			await transaction.rollback()
			return
		}

		const table = await queryInterface.describeTable('generalSettings')

		if ('isSeasonActive' in table) {
			await queryInterface.renameColumn('generalSettings', 'isSeasonActive', 'isOffSeason', {
				transaction,
			})
			await queryInterface.sequelize.query(
				`UPDATE "generalSettings" SET "isOffSeason" = NOT "isOffSeason";`,
				{ transaction }
			)
		}

		await transaction.commit()
	} catch (err) {
		await transaction.rollback()
		throw err
	}
}
