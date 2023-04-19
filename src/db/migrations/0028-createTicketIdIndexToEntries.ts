import { QueryInterface } from 'sequelize'
import { checkTableExists } from '../../utils/helpers'
export async function up(queryInterface: QueryInterface) {
	try {
		const exists = await checkTableExists(queryInterface, 'entries')

		if (!exists) {
			return Promise.resolve()
		}

		await queryInterface.sequelize.query(
			'create index entries_ticketid on entries ("ticketId") '
		)
		return Promise.resolve()
	} catch (err) {
		throw err
	}
}

export async function down(queryInterface: QueryInterface) {
	await queryInterface.sequelize.query('drop index entries_ticketid')

	return Promise.resolve()
}
