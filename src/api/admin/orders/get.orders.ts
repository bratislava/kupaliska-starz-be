import Joi from 'joi'
import { Op } from 'sequelize'
import { NextFunction, Request, Response } from 'express'
import { models } from '../../../db/models'
import { map } from 'lodash'
import { formatOrder } from '../../../utils/formatters'
import { ORDER_STATES } from '../../../utils/enums'
import { getSequelizeFilters } from '../../../utils/dbFilters'
import { downloadOrdersAsCsv } from '../../../utils/csvExport'

export const filtersSchema = Joi.object().keys({
	state: Joi.object().keys({
		value: Joi.array().min(1).required().items(Joi.string().valid(...ORDER_STATES).required()),
		type: Joi.string().valid('in').default('in')
	}),
	swimmingPools: Joi.object().keys({
		value: Joi.array().min(1).required().items(Joi.string().guid({ version: ['uuidv4'] }).required()),
		type: Joi.string().valid('in').default('in')
	}),
	ticketTypes: Joi.object().keys({
		value: Joi.array().min(1).required().items(Joi.string().guid({ version: ['uuidv4'] }).required()),
		type: Joi.string().valid('in').default('in')
	}),
	email: Joi.object().keys({
		value: Joi.string().required(),
		type: Joi.string().valid('like').default('like')
	}),
	createdAt: Joi.object().keys({
		from: Joi.date(),
		to: Joi.date().when('type', { is: Joi.valid('range'), then: Joi.when('from', { is: Joi.required(), otherwise: Joi.required() }) }),
		type: Joi.string().valid('range').default('range'),
		dataType: Joi.string().default('date')
	}),
})

export const schema = Joi.object().keys({
	body: Joi.object(),
	query: Joi.object().keys({
		filters: filtersSchema,
		export: Joi.boolean().default(false),
		limit: Joi.number().integer().min(1).default(20).empty(['', null]),
		page: Joi.number().integer().min(1).default(1).empty(['', null]),
		order: Joi.string().valid(
			'orderNumber',
			'price',
			'state',
			'discount',
			'createdAt',
			'updatedAt'
		).empty(['', null]).default('createdAt'),
		direction: Joi.string().lowercase().valid('asc', 'desc').empty(['', null]).default('desc')
	}),
	params: Joi.object()
})

const {
	Order,
} = models


export const workflow = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { query }: any = req
		const { limit, page } = query
		const offset = (limit * page) - limit

		const { swimmingPools, ticketTypes, email, ...otherFilters } = query.filters || {}
		const orderFilters = getSequelizeFilters(otherFilters || {}, "order")
		const swimmingPoolFilter = getSequelizeFilters(swimmingPools ? { swimmingPoolId: swimmingPools } : {})
		const ticketTypeFilter = getSequelizeFilters(ticketTypes ? { ticketTypeId: ticketTypes } : {})
		const profileFilter = getSequelizeFilters(email ? { email } : {})

		const result = await Order.findAndCountAll({
			attributes: [
				'id',
				'price',
				'discount',
				'state',
				'orderNumber',
				'createdAt',
				'updatedAt'
			],
			distinct: true,
			include: [{
				association: 'tickets',
				attributes: ['id', 'isChildren'],
				required: true,
				where: {
					[Op.and]: ticketTypeFilter
				},
				include: [
					{
						association: 'profile',
						attributes: ['id', 'name', 'email'],
						duplicating: true,
						required: true,
						where: {
							[Op.and]: profileFilter,
						},
					},
					{
						association: 'ticketType',
						attributes: ['id', 'name'],
						paranoid: false,
						required: true,
						duplicating: true,
						include: [{
							association: 'swimingPoolTicketType',
							required: true,
							where: {
								[Op.and]: swimmingPoolFilter,
							},
						}]
					},
				]
			}],
			limit: query.export ? undefined : limit,
			offset: query.export ? undefined : offset,
			where: {
				[Op.and]: orderFilters,
			},
			order: [[query.order, query.direction]]
		})


		if (query.export) {
			return downloadOrdersAsCsv(res, 'orders.csv', result.rows)
		}

		return res.json({
			orders: map(result.rows, (order) => (formatOrder(order))),
			pagination: {
				page: query.page,
				limit: query.limit,
				totalPages: Math.ceil(result.count / limit) || 0,
				totalCount: result.count
			}
		})
	} catch (err) {
		return next(err)
	}
}
