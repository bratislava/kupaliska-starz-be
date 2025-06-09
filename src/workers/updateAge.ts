import { Op } from 'sequelize'
import logger from '../utils/logger'
import { models } from '../db/models'
import { calculateAge } from '../utils/helpers'

process.on('message', async () => {
	logger.info('Compute users age')
	const { SwimmingLoggedUser, AssociatedSwimmer } = models

	try {
		const swimmingLoggedUsers = await SwimmingLoggedUser.findAll({
			where: {
				dateOfBirth: {
					[Op.ne]: null,
				},
			},
			attributes: ['id', 'dateOfBirth'],
		})

		for (const swimmingLoggedUser of swimmingLoggedUsers) {
			const age = calculateAge(
				swimmingLoggedUser.dateOfBirth.toISOString()
			)
			await swimmingLoggedUser.update({ age })
		}

		const associatedSwimmers = await AssociatedSwimmer.findAll({
			where: {
				dateOfBirth: {
					[Op.ne]: null,
				},
			},
			attributes: ['id', 'dateOfBirth'],
		})

		for (const associatedSwimmer of associatedSwimmers) {
			const age = calculateAge(
				associatedSwimmer.dateOfBirth.toISOString()
			)
			await associatedSwimmer.update({ age })
		}

		return process.send({ type: 'success' })
	} catch (err) {
		logger.info(JSON.stringify(err))
		logger.info(
			`ERROR - Compute users age failed - ERROR: ${JSON.stringify(err)}`
		)
		return process.send({ type: 'error', err })
	}
})
