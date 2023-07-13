import Joi from 'joi'
import { Request, Response, NextFunction } from 'express'
import { models } from '../../../db/models'
import ErrorBuilder from '../../../utils/ErrorBuilder'
import { UserModel } from '../../../db/models/user'
import { MESSAGE_TYPE } from '../../../utils/enums'

export const schema = Joi.object().keys({
	body: Joi.object(),
	query: Joi.object(),
	params: Joi.object(),
})

const { User } = models

export const workflow = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	try {
		const user = req.user as UserModel
		const userExists = await User.findByPk(user.id)

		if (!userExists) {
			throw new ErrorBuilder(404, req.t('error:userNotFound'))
		}

		await userExists.update({
			tokenValidFromNumber: userExists.issuedTokens + 1,
		})

		return res.json({
			data: {},
			messages: [
				{
					type: MESSAGE_TYPE.SUCCESS,
					message: req.t('success:sucessfulLogout'),
				},
			],
		})
	} catch (err) {
		return next(err)
	}
}
