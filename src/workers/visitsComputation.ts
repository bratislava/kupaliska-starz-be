import { sequelize } from '../db/models'
import logger from '../utils/logger'

process.on('message', async () => {
	logger.info('COMPUTE VISITS')
	try {
		await sequelize.query(
			`
			REFRESH MATERIALIZED VIEW visits;`,
			{
				raw: true,
			}
		)

		return process.send({ type: 'success' })
	} catch (err) {
		logger.info(JSON.stringify(err))
		logger.info(
			`ERROR - Visits computation worker failed - ERROR: ${JSON.stringify(
				err
			)}`
		)
		return process.send({ type: 'error', err })
	}
})
