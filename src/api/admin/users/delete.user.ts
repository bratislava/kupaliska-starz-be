import Joi from 'joi'
import { Request, Response, NextFunction } from 'express'
import { MESSAGE_TYPE } from '../../../utils/enums'
import { models } from '../../../db/models'
import ErrorBuilder from '../../../utils/ErrorBuilder'
import { UserModel } from '../../../db/models/user'

const { User } = models

export const schema = Joi.object().keys({
	body: Joi.object(),
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
	try {
		const { params } = req
		const authUser = req.user as UserModel

		const user = await User.unscoped().findByPk(params.userId)

		if (!user) {
			throw new ErrorBuilder(404, req.t('error:userNotFound'))
		}

		if (authUser.canPerformAction(user.role) === false) {
			throw new ErrorBuilder(403, 'Forbidden action')
		}

		await user.destroy()

		return res.json({
			data: {
				id: user.id,
			},
			messages: [
				{
					type: MESSAGE_TYPE.SUCCESS,
					message: req.t('success:admin.users.deleted'),
				},
			],
		})
	} catch (err) {
		return next(err)
	}
}
