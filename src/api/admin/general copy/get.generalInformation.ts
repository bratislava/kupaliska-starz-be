import { Request, Response, NextFunction } from 'express'
import { models } from '../../../db/models'
import ErrorBuilder from '../../../utils/ErrorBuilder'

import Joi from 'joi'

export const schema = Joi.object().keys({
	body: Joi.object(),
	query: Joi.object(),
	params: Joi.object().keys({}),
})

const { GeneralInformations } = models

export const workflow = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	try {
		const general = await GeneralInformations.findOne({
			attributes: [
				'id',
				'alertText',
				'showAlert',
				'alertTextColor',
				'alertColor',
				'seasonTitle',
				'seasonSubtitle',
				'isOffSeason',
				'offSeasonTitle',
				'offSeasonSubtitle',
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
