import { Request, Response, NextFunction } from 'express'
import ErrorBuilder from '../utils/ErrorBuilder'
import { models } from '../db/models'
import logger from '../utils/logger'

export default async (req: Request, _res: Response, next: NextFunction) => {
	try {
		const { GeneralSettings } = models

		const general = await GeneralSettings.findOne({
			attributes: ['isSeasonActive'],
		})

		if (!general || general?.isSeasonActive === undefined) {
			logger.error(`GeneralSettings not found. general: ${JSON.stringify(general)}`)
			return next(new ErrorBuilder(400, req.t('error:seasonNotActive')))
		}
		if (!general.isSeasonActive) {
			return next(new ErrorBuilder(400, req.t('error:seasonNotActive')))
		}

		next()
	} catch (error) {
		return next(error)
	}
}
