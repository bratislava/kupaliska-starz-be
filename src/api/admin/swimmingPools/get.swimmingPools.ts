import Joi from 'joi'
import { Op } from 'sequelize'
import { NextFunction, Request, Response } from 'express'
import { models } from '../../../db/models'
import { map } from 'lodash'
import { formatSwimmingPool } from '../../../utils/formatters'
import { USER_ROLE } from '../../../utils/enums'

export const schema = Joi.object().keys({
	body: Joi.object(),
	query: Joi.object().keys({
		search: Joi.string().allow(null, ''),
		limit: Joi.number().integer().min(1).default(20).empty(['', null]),
		page: Joi.number().integer().min(1).default(1).empty(['', null]),
		order: Joi.string().valid(
			'name',
			'description',
			'expandedDescription',
			'waterTemp',
			'maxCapacity',
			'createdAt',
		).empty(['', null]).default('createdAt'),
		direction: Joi.string().lowercase().valid('asc', 'desc').empty(['', null]).default('desc')
	}),
	params: Joi.object()
})

const {
	SwimmingPool
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

		const swimmingPools = await SwimmingPool.findAll({
			attributes: [
				'id',
				'name',
				'description',
				'expandedDescription',
				'waterTemp',
				'maxCapacity',
				'facilities',
				'openingHours',
				'locationUrl',
				'createdAt',
			],
			where,
			limit,
			offset,
			order: [[query.order, query.direction]],
			include: [{ association: "image" }]
		})

		const count = await SwimmingPool.count({
			where
		})

		return res.json({
			swimmingPools: map(swimmingPools, (pool) => (
				formatSwimmingPool(pool, USER_ROLE.OPERATOR)
			)),
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
