import { formatTicketType } from './../../../utils/formatters'
import Joi from 'joi'
import { Op } from 'sequelize'
import { NextFunction, Request, Response } from 'express'
import { models } from '../../../db/models'
import { map } from 'lodash'

export const schema = Joi.object().keys({
	body: Joi.object(),
	query: Joi.object().keys({
		search: Joi.string().allow(null, ''),
		limit: Joi.number().integer().min(1).default(20).empty(['', null]),
		page: Joi.number().integer().min(1).default(1).empty(['', null]),
		order: Joi.string()
			.valid(
				'name',
				'description',
				'priceWithTax',
				'priceWithoutTax',
				'priceTax',
				'type',
				'createdAt'
			)
			.empty(['', null])
			.default('name'),
		direction: Joi.string()
			.lowercase()
			.valid('asc', 'desc')
			.empty(['', null])
			.default('asc'),
		withSoftDeleted: Joi.boolean().default(false),
	}),
	params: Joi.object(),
})

const { TicketType } = models

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

		const ticketTypes = await TicketType.findAll({
			attributes: [
				'id',
				'name',
				'description',
				'priceWithTax',
				'priceWithoutTax',
				'priceTax',
				'type',
				'entriesNumber',
				'hasEntranceConstraints',
				'entranceFrom',
				'entranceTo',
				'hasTicketDuration',
				'ticketDuration',
				'validFrom',
				'validTo',
				'isSeniorIsDisabled',
				'childrenAllowed',
				'childrenPriceWithTax',
				'childrenPriceWithoutTax',
				'childrenPriceTax',
				'photoRequired',
				'nameRequired',
				'createdAt',
				'deletedAt',
			],
			include: { association: 'swimmingPools' },
			where,
			limit,
			offset,
			order: [[query.order, query.direction]],
			paranoid: !Boolean(query.withSoftDeleted),
		})

		const count = await TicketType.count({
			where,
			paranoid: !Boolean(query.withSoftDeleted),
		})

		return res.json({
			ticketTypes: map(ticketTypes, (ticketType) =>
				formatTicketType(ticketType)
			),
			pagination: {
				page: query.page,
				limit: query.limit,
				totalPages: Math.ceil(count / limit) || 0,
				totalCount: count,
			},
		})
	} catch (err) {
		return next(err)
	}
}
