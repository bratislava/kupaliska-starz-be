import { QueryInterface } from 'sequelize'
import { models } from '../../models'

const { TicketType, SwimmingPool } = models
export async function up(queryInterface: QueryInterface) {

	const ticketTypes = await TicketType.findAll()
	const swimmingPools = await SwimmingPool.findAll()
	const data = []
	for (const ticketType of ticketTypes) {
		for (const swimmingPool of swimmingPools) {
			data.push({
				ticketTypeId: ticketType.id,
				swimmingPoolId: swimmingPool.id
			})
		}
	}

	return queryInterface.bulkInsert('swimmingPoolTicketType', data)
}

export async function down(queryInterface: QueryInterface) {
	return queryInterface.bulkDelete('swimmingPoolTicketType', undefined)
}
