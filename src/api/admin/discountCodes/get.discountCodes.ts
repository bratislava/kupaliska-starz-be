import Joi from 'joi'
import { Op } from 'sequelize'
import { NextFunction, Request, Response } from 'express'
import { models } from '../../../db/models'
import { map } from 'lodash'
import { formatDiscountCode } from '../../../utils/formatters'
import { downloadDiscountCodesAsCsv } from '../../../utils/csvExport'

export const schema = Joi.object().keys({
	body: Joi.object(),
	query: Joi.object().keys({
		search: Joi.string().allow(null, ''),
		limit: Joi.number().integer().min(1).default(20).empty(['', null]),
		export: Joi.boolean().default(false),
		page: Joi.number().integer().min(1).default(1).empty(['', null]),
		order: Joi.string().valid(
			'code',
			'validFrom',
			'validTo',
			'amount',
			'createdAt',
			'usedAt'
		).empty(['', null]).default('createdAt'),
		direction: Joi.string().lowercase().valid('asc', 'desc').empty(['', null]).default('desc')
	}),
	params: Joi.object()
})

const {
	DiscountCode
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

		const discountCodes = await DiscountCode.findAll({
			attributes: [
				'id',
				'code',
				'amount',
				'validFrom',
				'validTo',
				'createdAt',
				'usedAt'
			],
			where,
			limit: query.export ? undefined : limit,
			offset: query.export ? undefined : offset,
			order: [[query.order, query.direction]],
			include: [
				{
					association: "ticketTypes"
				},
				{
					association: "order",
					include: [{
						required: false,
						separate: true,
						association: 'tickets',
						limit: 1,
						where: {
							isChildren: {
								[Op.is]: false
							}
						},
						include: [{
							association: 'profile'
						}]
					}]
				}
			],
		})

		if (query.export) {
			return downloadDiscountCodesAsCsv(res, 'discount-codes.csv', discountCodes)
		}

		const count = await DiscountCode.count({
			where
		})

		return res.json({
			discountCodes: map(discountCodes, (code) => (
				formatDiscountCode(code)
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
