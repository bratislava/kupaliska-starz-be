import { QueryInterface, DataTypes, Op } from 'sequelize'
import { checkTableExists } from '../../utils/helpers'
import { models } from '../models'

export async function up(queryInterface: QueryInterface) {
	try {
		const { Ticket, SwimmingLoggedUser } = models

		const exists = await checkTableExists(queryInterface, 'tickets')

		if (!exists) {
			return Promise.resolve()
		}

		const table: any = await queryInterface.describeTable('tickets')

		if (!table.swimmingLoggedUserId) {
			await queryInterface.addColumn('tickets', 'swimmingLoggedUserId', {
				type: DataTypes.UUID,
				allowNull: true,
			})
		}

		if (table.loggedUserId && !table.externalAzureId) {
			await queryInterface.renameColumn(
				'tickets',
				'loggedUserId',
				'externalAzureId'
			)
		}

		return Promise.resolve()
	} catch (err) {
		throw err
	}
}

export async function down(queryInterface: QueryInterface) {
	const table: any = await queryInterface.describeTable('tickets')

	if (!table.loggedUserId && table.externalAzureId) {
		await queryInterface.renameColumn(
			'tickets',
			'externalAzureId',
			'loggedUserId'
		)
	}

	if (table.swimmingLoggedUserId) {
		await queryInterface.removeColumn('tickets', 'swimmingLoggedUserId')
	}

	return Promise.resolve()
}
