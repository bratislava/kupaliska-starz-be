import { joiCustomSanitizeRules } from './../../../utils/validation'
import Joi from 'joi'

import { NextFunction, Request, Response } from 'express'
import { MESSAGE_TYPE } from '../../../utils/enums'
import { sendRawEmail } from '../../../services/mailerService'
import { IAppConfig } from '../../../types/interfaces'
import config from 'config'

const appConfig: IAppConfig = config.get('app')
const JoiExtended = Joi.extend(joiCustomSanitizeRules())

export const contactSchema = {
	name: JoiExtended.string().max(255).required().htmlStrip(),
	email: JoiExtended.string().email().max(255).required().htmlStrip(),
	message: JoiExtended.string().required().max(5000).htmlStrip(),
	agreement: Joi.boolean().valid(true).required(),
	token: Joi.string().required(),
}

export const schema = Joi.object().keys({
	body: Joi.object().keys(contactSchema),
	query: Joi.object(),
	params: Joi.object(),
})

export const workflow = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	try {
		const { body } = req

		await sendRawEmail(
			req,
			appConfig.contactEmail,
			req.t('email:contactSubject'),
			`<strong>${req.t('name')}:</strong> ${body.name} <br>
			 <strong>${req.t('email')}:</strong> ${body.email} <br>
			 <strong>${req.t('message')}:</strong> ${body.message}<br>
			`
		)

		return res.json({
			data: {},
			messages: [
				{
					type: MESSAGE_TYPE.SUCCESS,
					message: req.t('success:contactSent'),
				},
			],
		})
	} catch (err) {
		return next(err)
	}
}
