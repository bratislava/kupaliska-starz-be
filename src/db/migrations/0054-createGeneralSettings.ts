import { QueryInterface } from 'sequelize'
import { checkTableExists } from '../../utils/helpers'
import DB from '../../db/models'

export async function up(queryInterface: QueryInterface) {
	try {
		const exists = await checkTableExists(
			queryInterface,
			'generalInformations'
		)

		if (!exists) {
			return Promise.resolve()
		}

		queryInterface.renameTable('generalInformations', 'generalSettings')

		return Promise.resolve()
	} catch (err) {
		throw err
	}
}

export async function down(queryInterface: QueryInterface) {
	try {
		const exists = await checkTableExists(queryInterface, 'generalSettings')

		if (!exists) {
			return Promise.resolve()
		}

		queryInterface.renameTable('generalSettings', 'generalInformations')

		return Promise.resolve()
	} catch (err) {
		throw err
	}
}
