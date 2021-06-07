import { ENTRY_TYPE } from './../../../utils/enums';
import Joi from 'joi'
import { QueryTypes } from 'sequelize'
import { NextFunction, Request, Response } from 'express'
import sequelize from '../../../db/models'
import { getFilters } from '../../../utils/dbFilters';

export const schema = Joi.object().keys({
	body: Joi.object(),
	query: Joi.object().keys({
		filters: Joi.object().keys({
			customerEmail: Joi.object().keys({
				value: Joi.string().required(),
				type: Joi.string().valid('exact', 'like').default('like')
			}),
			customerName: Joi.object().keys({
				value: Joi.string().required(),
				type: Joi.string().valid('exact', 'like').default('like')
			}),
			age: Joi.object().keys({
				from: Joi.number(),
				to: Joi.number().when('type', { is: Joi.valid('range'), then: Joi.when('from', { is: Joi.required(), otherwise: Joi.required() }) }),
				type: Joi.string().valid('range').default('range')
			}),

		}),
		limit: Joi.number().integer().min(1).default(20).empty(['', null]),
		page: Joi.number().integer().min(1).default(1).empty(['', null]),
		order: Joi.string().valid(
			'customerEmail',
			'customerNames',
			'customerAges',
			'orderCount',
			'lastOrderAt',
			'lastEntryAt'
		).empty(['', null]).default('customerEmail'),
		direction: Joi.string().lowercase().valid('asc', 'desc').empty(['', null]).default('asc')
	}),
	params: Joi.object()
})

export const workflow = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { query }: any = req
		const { limit, page } = query
		const offset = (limit * page) - limit

		const { age, customerEmail, customerName } = query.filters || {}
		const [profileFilterVariables, profilefilterSQL] = getFilters( { age, email: customerEmail, name: customerName }, 'profile')

		const result = await sequelize.query(`
			SELECT
				"profile"."email" AS "customerEmail",
				string_agg(DISTINCT(BTRIM(CAST("profile"."age" AS VARCHAR))), ', ') AS "customerAges",
				string_agg(DISTINCT(TRIM("profile"."zip")), ', ') AS "customerZips",
				string_agg(DISTINCT(BTRIM("profile"."name")), ', ') AS "customerNames",
				COUNT("order"."id") AS "orderCount",
				MAX("order"."createdAt") AS "lastOrderAt",
				MAX("ticket"."lastEntryAt") AS "lastEntryAt"
			FROM ( 
				SELECT
					"ticket"."id",
					"ticket"."profileId",
					"ticket"."orderId",
					MAX("entries"."timestamp") AS "lastEntryAt"
				FROM "tickets" AS "ticket"
				LEFT OUTER JOIN "entries" AS "entries" ON "ticket"."id" = "entries"."ticketId" AND "entries"."type" = $entryType
				WHERE ("ticket"."deletedAt" IS NULL)
				GROUP BY "ticket"."id"
			) AS "ticket"
			LEFT OUTER JOIN "profiles" AS "profile" ON "ticket"."profileId" = "profile"."id" AND ("profile"."deletedAt" IS NULL)
			LEFT OUTER JOIN "orders" AS "order" ON "ticket"."orderId" = "order"."id" AND ("order"."deletedAt" IS NULL)
			WHERE 1=1 ${profilefilterSQL}
			GROUP BY "profile"."email"
			ORDER BY "${query.order}" ${query.direction}
			LIMIT $limit
			OFFSET $offset;`,
			{
				bind: {
					limit,
					offset,
					entryType: ENTRY_TYPE.CHECKIN,
					...profileFilterVariables
				},
				raw: true,
				type: QueryTypes.SELECT
			}
		);

		const resultCount = await sequelize.query<{ count: number}>(`
			SELECT
				COUNT(*) as "count"
			FROM (
				SELECT
					"profile"."email" AS "customerEmail"
				FROM "tickets" AS "ticket"
				LEFT OUTER JOIN "profiles" AS "profile" ON "ticket"."profileId" = "profile"."id" AND ("profile"."deletedAt" IS NULL)
				WHERE ("ticket"."deletedAt" IS NULL) ${profilefilterSQL}
				GROUP BY "profile"."email"
			) as "subq";`,
			{
				bind: {
					...profileFilterVariables
				},
				raw: true,
				type: QueryTypes.SELECT,
			}
		);

		return res.json({
			customers: result,
			pagination: {
				page: query.page,
				limit: query.limit,
				totalPages: Math.ceil(resultCount[0].count / limit) || 0,
				totalCount: resultCount[0].count
			}
		})
	} catch (err) {
		return next(err)
	}
}
