import { QueryInterface } from 'sequelize'
import { models } from '../../models'

const { TicketType } = models
export async function up(queryInterface: QueryInterface) {
	// queryInterface does not execute model hooks during migration execution,
	// so we need to update the ordering manually,
	// otherwise the ordering will be default value 0
	const ticketTypes = await TicketType.findAll()
	let ordering = 1
	for (const ticketType of ticketTypes) {
		await queryInterface.bulkUpdate(
			'ticketTypes',
			{
				ordering,
			},
			{ id: ticketType.id }
		)
		ordering++
	}
}

export async function down(queryInterface: QueryInterface) {}
