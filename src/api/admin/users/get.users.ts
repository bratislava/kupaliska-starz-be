import Joi from 'joi'
import { Op } from 'sequelize'
import { NextFunction, Request, Response } from 'express'
import { models } from '../../../db/models'
import { map } from 'lodash'
import { formatUser } from '../../../utils/formatters'

export const schema = Joi.object().keys({
	body: Joi.object(),
	query: Joi.object().keys({
		search: Joi.string().allow(null, ''),
		limit: Joi.number().integer().min(1).default(20).empty(['', null]),
		page: Joi.number().integer().min(1).default(1).empty(['', null]),
		order: Joi.string().valid(
			'name',
			'email',
			'role',
			'createdAt',
			'updatedAt'
		).empty(['', null]).default('createdAt'),
		direction: Joi.string().lowercase().valid('asc', 'desc').empty(['', null]).default('desc')
	}),
	params: Joi.object()
})

const {
	User
} = models


export const workflow = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { query }: any = req
		const { limit, page } = query
		const offset = (limit * page) - limit

		const where: any = {}

		if (query.search) {
			where.name = {
				[Op.iLike]: `%${query.search}%`
			}
		}

		const users = await User.unscoped().findAll({
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
			include: { association: 'swimmingPools'},
			paranoid: false,
			where,
			limit,
			offset,
			order: [[query.order, query.direction]]
		})

		const count = await User.unscoped().count({
			where,
			paranoid: false
		})

		return res.json({
			users: map(users, (user) => (formatUser(user))),
			pagination: {
				page: query.page,
				limit: query.limit,
				totalPages: Math.ceil(count / limit) || 0,
				totalCount: count
			}
		})
	} catch (err) {
		return next(err)
	}
}
