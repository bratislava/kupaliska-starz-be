import Joi from 'joi'
import { NextFunction, Request, Response } from 'express'
import { models } from '../../../db/models'
import { MESSAGE_TYPE } from '../../../utils/enums'
import ErrorBuilder from '../../../utils/ErrorBuilder'
import { UserModel } from '../../../db/models/user'

export const schema = Joi.object().keys({
	body: Joi.object().keys(),
	query: Joi.object(),
	params: Joi.object().keys({
		userId: Joi.string()
			.guid({ version: ['uuidv4'] })
			.required(),
	}),
})

export const workflow = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	const { User } = models

	try {
		const { params } = req
		const authUser = req.user as UserModel

		const user = await User.unscoped().findByPk(params.userId, {
			paranoid: false,
		})
		if (!user) {
			throw new ErrorBuilder(404, req.t('error:userNotFound'))
		}

		if (authUser.canPerformAction(user.role) === false) {
			throw new ErrorBuilder(403, 'Forbidden action')
		}

		await user.restore()

		return res.json({
			data: {
				id: user.id,
			},
			messages: [
				{
					type: MESSAGE_TYPE.SUCCESS,
					message: req.t('success:admin.users.restored'),
				},
			],
		})
	} catch (err) {
		return next(err)
	}
}
