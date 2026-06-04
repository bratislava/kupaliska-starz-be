import { Request, Response, NextFunction } from 'express'
import ErrorBuilder from '../utils/ErrorBuilder'
import { models } from '../db/models'

export default async (req: Request, _res: Response, next: NextFunction) => {
	const { GeneralSettings } = models

	const general = await GeneralSettings.findOne({
		attributes: ['alertText', 'showAlert', 'isOffSeason'],
	})

	if (!general) {
		throw new ErrorBuilder(404, req.t('error:generalNotFound'))
	}
	if (general.isOffSeason)
		return next(new ErrorBuilder(400, req.t('error:offseason')))
	next()
}
