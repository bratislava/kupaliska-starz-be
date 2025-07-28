import { Request, Response, NextFunction } from 'express'
import { models } from '../../../db/models'
import ErrorBuilder from '../../../utils/ErrorBuilder'

import Joi from 'joi'

export const generalInformationsPatchSchema = {
	alertText: Joi.string().max(250).allow(null, ''),
	showAlert: Joi.boolean().required(),
}

export const schema = Joi.object().keys({
	body: Joi.object().keys(generalInformationsPatchSchema),
	query: Joi.object(),
	params: Joi.object(),
})

const { GeneralInformation: GeneralInformations } = models

export const workflow = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	try {
		const { body } = req

		const generalInformations = await GeneralInformations.findOne()

		if (!generalInformations) {
			throw new ErrorBuilder(404, req.t('error:generalNotFound'))
		}

		await generalInformations.update(body)

		return res.json(generalInformations)
	} catch (err) {
		return next(err)
	}
}
