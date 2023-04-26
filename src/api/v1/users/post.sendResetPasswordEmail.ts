import config from 'config'
import Joi from 'joi'
import { NextFunction, Request, Response } from 'express'
import { models } from '../../../db/models'
import { MESSAGE_TYPE } from '../../../utils/enums'
import ErrorBuilder from '../../../utils/ErrorBuilder'
import { createJwt } from '../../../utils/authorization'
import {
	IAppConfig,
	IMailgunserviceConfig,
	IPassportConfig,
} from '../../../types/interfaces'
import { Op } from 'sequelize'
import { sendEmail } from '../../../services/mailerService'

const appConfig: IAppConfig = config.get('app')
const passwordConfig: IPassportConfig = config.get('passport')
const mailgunConfig: IMailgunserviceConfig = config.get('mailgunService')
const resetPasswordTemplate = mailgunConfig.templates.resetPassword

export const userResetPasswordSchema = {
	email: Joi.string().email().max(255).required(),
}

export const schema = Joi.object().keys({
	body: Joi.object().keys(userResetPasswordSchema),
	query: Joi.object(),
	params: Joi.object(),
})

export const workflow = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	const { User } = models

	try {
		const { body } = req

		const userExists = await User.findOne({
			where: {
				email: { [Op.eq]: body.email },
			},
		})

		if (!userExists) {
			throw new ErrorBuilder(404, req.t('error:wrongEmail'))
		}

		const accessToken = await createJwt(
			{
				uid: userExists.id,
			},
			{
				audience: passwordConfig.jwt.resetPassword.audience,
				expiresIn: passwordConfig.jwt.forgottenPassword.exp,
			}
		)

		// send email
		await sendEmail(
			req,
			body.email,
			req.t('email:resetPasswordSubject'),
			resetPasswordTemplate,
			{
				resetLink: `${appConfig.feResetPasswordUrl}?token=${accessToken}`,
			}
		)

		return res.json({
			data: {},
			messages: [
				{
					type: MESSAGE_TYPE.SUCCESS,
					message: req.t('success:passwordResetEmailSent'),
				},
			],
		})
	} catch (err) {
		return next(err)
	}
}
