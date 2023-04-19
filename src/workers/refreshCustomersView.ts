import { sequelize } from '../db/models'
import logger from '../utils/logger'

process.on('message', async () => {
	console.log('REFRESH MATERIALIZED VIEW customers')
	try {
		await sequelize.query(
			`
			REFRESH MATERIALIZED VIEW customers;`,
			{
				raw: true,
			}
		)

		return process.send({ type: 'success' })
	} catch (err) {
		console.log(JSON.stringify(err))
		logger.info(
			`ERROR - Refreshing materialized view customers failed - ERROR: ${JSON.stringify(
				err
			)}`
		)
		return process.send({ type: 'error', err })
	}
})
