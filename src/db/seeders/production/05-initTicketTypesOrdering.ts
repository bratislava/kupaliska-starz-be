import { QueryInterface } from 'sequelize'
import { models } from '../../models'

const { TicketType } = models
export async function up(queryInterface: QueryInterface) {
	// queryInterface does not execute model hooks during migration execution,
	// so we need to update the displayOrder manually,
	// otherwise the displayOrder will be default value 0
	const ticketTypes = await TicketType.findAll()
	let displayOrder = 1
	for (const ticketType of ticketTypes) {
		await queryInterface.bulkUpdate(
			'ticketTypes',
			{
				displayOrder,
			},
			{ id: ticketType.id }
		)
		displayOrder++
	}
}

export async function down(queryInterface: QueryInterface) {}
