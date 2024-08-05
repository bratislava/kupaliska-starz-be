import { Request, Response, NextFunction } from 'express'
import { models } from '../../../db/models'
import ErrorBuilder from '../../../utils/ErrorBuilder'

import Joi from 'joi'

export const schema = Joi.object().keys({
	body: Joi.object(),
	query: Joi.object(),
	params: Joi.object().keys({}),
})

const { GeneralInformation: General } = models

export const workflow = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	try {
		const general = await General.unscoped().findOne({
			attributes: [
				'id',
				'alertText',
				'alertTextColor',
				'alertColor',
				'seasonTitle',
				'seasonSubtitle',
				'isOffSeason',
				'offSeasonTitle',
				'offSeasonSubtitle',
				'mainImageAddress',
				'mainImageMobileAddress',
				'logoAddress',
				'createdAt',
				'updatedAt',
				'deletedAt',
			],
		})

		if (!general) {
			throw new ErrorBuilder(404, req.t('error:generalNotFound'))
		}

		return res.json(general)
	} catch (err) {
		return next(err)
	}
}
