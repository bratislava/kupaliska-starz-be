import { Request, Response, NextFunction } from 'express'
import { models } from '../../../db/models'
import ErrorBuilder from '../../../utils/ErrorBuilder'

import Joi from 'joi'

export const generalPatchSchema = {
	alertText: Joi.string().max(250).allow(null, ''),
	showAlert: Joi.boolean().required(),
}

export const schema = Joi.object().keys({
	body: Joi.object().keys(generalPatchSchema),
	query: Joi.object(),
	params: Joi.object(),
})

const { GeneralInformation } = models

export const workflow = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	try {
		const { body } = req

		const generalInformation = await GeneralInformation.findOne()

		if (!generalInformation) {
			throw new ErrorBuilder(404, req.t('error:generalNotFound'))
		}

		await generalInformation.update(body)

		return res.json(generalInformation)
	} catch (err) {
		return next(err)
	}
}
