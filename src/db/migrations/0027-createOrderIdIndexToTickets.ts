import { QueryInterface } from 'sequelize'
import { checkTableExists } from '../../utils/helpers'
export async function up(queryInterface: QueryInterface) {
	try {
		const exists = await checkTableExists(queryInterface, 'tickets')

		if (!exists) {
			return Promise.resolve()
		}

		await queryInterface.sequelize.query('create index tickets_orderid  on tickets ("orderId")');
		await queryInterface.sequelize.query('create index tickets_tickettypeid on tickets ("ticketTypeId")');
		return Promise.resolve()

	} catch (err) {
		throw err;
	}
}

export async function down(queryInterface: QueryInterface) {
	await queryInterface.sequelize.query('drop index tickets_orderid');
	await queryInterface.sequelize.query('drop index tickets_tickettypeid');

	return Promise.resolve()
}
