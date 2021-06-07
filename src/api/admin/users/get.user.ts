import Joi from 'joi'
import { Op } from 'sequelize'
import { NextFunction, Request, Response } from 'express'
import { models } from '../../../db/models'
import ErrorBuilder from '../../../utils/ErrorBuilder'
import { formatUser } from '../../../utils/formatters'

const {
	User,
} = models

export const schema = Joi.object().keys({
	body: Joi.object(),
	query: Joi.object(),
	params: Joi.object().keys({
		userId: Joi.string().guid({version: ['uuidv4']}).required()
	})
})

export const workflow = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { params } = req

		const user = await User.unscoped().findOne({
			attributes: [
				'id',
				'name',
				'email',
				'role',
				'isConfirmed',
				'createdAt',
				'updatedAt',
				'deletedAt'
			],
			where: {
				id: { [Op.eq]: params.userId }
			},
			paranoid: false,
			include: { association: 'swimmingPools'}
		})

		if (!user) {
			throw new ErrorBuilder(404, req.t('error:userNotFound'))
		}

		return res.json(formatUser(user))
	} catch (err) {
		return next(err)
	}
}
