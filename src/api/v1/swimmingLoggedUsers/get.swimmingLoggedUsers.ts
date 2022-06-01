import Joi from 'joi'
import { NextFunction, Request, Response } from 'express'
import { Op } from 'sequelize'
import { map } from 'lodash'

import { models } from '../../../db/models'
import { formatSwimmingLoggedUser } from '../../../utils/formatters'

// TODO change according to Model
// export const schema = Joi.object().keys({
// 	body: Joi.object(),
// 	query: Joi.object().keys({
// 		// search: Joi.string().allow(null, ''),
// 		// limit: Joi.number().integer().min(1).default(20).empty(['', null]),
// 		// page: Joi.number().integer().min(1).default(1).empty(['', null]),
// 		// order: Joi.string().valid(
// 		// 	'name',
// 		// 	'description',
// 		// 	'price',
// 		// 	'type',
// 		// 	'createdAt',
// 		// ).empty(['', null]).default('name'),
// 		// direction: Joi.string().lowercase().valid('asc', 'desc').empty(['', null]).default('asc')
// 	}),
// 	params: Joi.object(),
// })

export const schema = Joi.object()

const { SwimmingLoggedUser } = models

export const workflow = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	try {
		const { query }: any = req

		const { limit, page } = query
		const offset = limit * page - limit

		const where: any = {}

		if (query.search) {
			where.name = {
				[Op.iLike]: `%${query.search}%`,
			}
		}

		const swimmingLoggedUsers = await SwimmingLoggedUser.findAll({
			attributes: [
				'id',
				'externalId',
				'age',
				'zip',
				'createdAt',
				'updatedAt',
				'deletedAt',
			],
			// where,
			// limit,
			// offset,
			// order: [[query.order, query.direction]],
			// include: { association: 'image' },
		})

		// const count = await SwimmingLoggedUser.count({
		// 	where,
		// })

		return res.json({
			swimmingLoggedUser: map(swimmingLoggedUsers, (swimmingLoggedUser) =>
				formatSwimmingLoggedUser(swimmingLoggedUser)
			),
			// pagination: {
			// 	page: query.page,
			// 	limit: query.limit,
			// 	totalPages: Math.ceil(count / limit) || 0,
			// 	totalCount: count,
			// },
		})
	} catch (err) {
		return next(err)
	}
}
