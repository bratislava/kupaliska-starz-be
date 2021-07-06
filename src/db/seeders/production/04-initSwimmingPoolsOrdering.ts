import { QueryInterface } from 'sequelize'
import { models } from '../../models'

const { SwimmingPool } = models
export async function up(queryInterface: QueryInterface) {

	const swimmingPools = await SwimmingPool.findAll()
	let ordering = 1
	for (const pool of swimmingPools) {
		await queryInterface.bulkUpdate('swimmingPools', {
			ordering
		}, { id: pool.id })
		ordering++
	}

}

export async function down(queryInterface: QueryInterface) {
}
