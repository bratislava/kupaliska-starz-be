import { Request, Response, NextFunction } from 'express'
import { models } from '../../../db/models'
import ErrorBuilder from '../../../utils/ErrorBuilder'

import Joi from 'joi'

export const generalSettingsPatchSchema = {
	alertText: Joi.string().max(250).allow(null, ''),
	showAlert: Joi.boolean().required(),
}

export const schema = Joi.object().keys({
	body: Joi.object().keys(generalSettingsPatchSchema),
	query: Joi.object(),
	params: Joi.object(),
})

const { GeneralSettings } = models

export const workflow = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	try {
		const { body } = req

		const generalSettings = await GeneralSettings.findOne()

		if (!generalSettings) {
			throw new ErrorBuilder(404, req.t('error:generalNotFound'))
		}

		await generalSettings.update(body)

		return res.json(generalSettings)
	} catch (err) {
		return next(err)
	}
}
