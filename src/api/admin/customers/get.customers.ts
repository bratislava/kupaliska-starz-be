import Joi from 'joi'
import { QueryTypes } from 'sequelize'
import { NextFunction, Request, Response } from 'express'
import sequelize from '../../../db/models'
import { getFilters } from '../../../utils/dbFilters'
import { map } from 'lodash'
import { UserModel } from '../../../db/models/user'
import { USER_ROLE } from '../../../utils/enums'

export const schema = Joi.object().keys({
	body: Joi.object(),
	query: Joi.object().keys({
		filters: Joi.object().keys({
			customerEmail: Joi.object().keys({
				value: Joi.string().required(),
				type: Joi.string().valid('exact', 'like').default('like'),
			}),
			customerName: Joi.object().keys({
				value: Joi.string().required(),
				type: Joi.string().valid('exact', 'like').default('like'),
			}),
			age: Joi.object().keys({
				from: Joi.number(),
				to: Joi.number().when('type', {
					is: Joi.valid('range'),
					then: Joi.when('from', {
						is: Joi.required(),
						otherwise: Joi.required(),
					}),
				}),
				showUnspecified: Joi.boolean().default(false),
				type: Joi.string().valid('range').default('range'),
			}),
		}),
		limit: Joi.number().integer().min(1).default(20).empty(['', null]),
		page: Joi.number().integer().min(1).default(1).empty(['', null]),
		order: Joi.string()
			.valid(
				'customerEmail',
				'customerNames',
				'customerAges',
				'orderCount',
				'lastOrderAt',
				'lastEntryAt'
			)
			.empty(['', null])
			.default('customerEmail'),
		direction: Joi.string()
			.lowercase()
			.valid('asc', 'desc')
			.empty(['', null])
			.default('asc'),
	}),
	params: Joi.object(),
})

export const workflow = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	try {
		const { query }: any = req
		const { limit, page } = query
		const offset = limit * page - limit
		const user = req.user as UserModel

		const { age, customerEmail, customerName } = query.filters || {}
		const [filterVariables, filterSQL] = getFilters({
			customerEmail: customerEmail,
			customerNames: customerName,
		})

		let ageFilterSql = ''
		if (age) {
			ageFilterSql += age.from
				? `$ageFrom <= any("customerAgesArr") `
				: ''
			const addAnd = age.from ? 'AND' : ''
			ageFilterSql += age.to
				? `${addAnd} $ageTo >= any("customerAgesArr") `
				: ''
			ageFilterSql = age.showUnspecified
				? `(${ageFilterSql} OR "customerAges" IS NULL)`
				: ageFilterSql

			filterVariables['ageFrom'] = age.from ? age.from : undefined
			filterVariables['ageTo'] = age.to ? age.to : undefined

			ageFilterSql = `AND ${ageFilterSql}`
		}

		await user.reload({ include: { association: 'swimmingPools' } })
		let swimmingPoolsFilterSql = ''
		if (user.role === USER_ROLE.SWIMMING_POOL_OPERATOR) {
			const usersSwimmingPools = map(
				user.swimmingPools,
				(pool) => pool.id
			)
			const usersSwimmingPoolsArray = map(
				usersSwimmingPools,
				(_id, index) => `$swimmingPool${index}::uuid`
			).join(',')
			swimmingPoolsFilterSql += `AND "swimmingPoolsArr" && ARRAY[${usersSwimmingPoolsArray}]`

			let index = 0
			for (const id of usersSwimmingPools) {
				filterVariables[`swimmingPool${index}`] = id
				index++
			}
		}

		const customers = await sequelize.query<{
			customerEmail: string
			customerAges: string
			customerZips: string
			customerNames: string
			orderCount: number
			lastOrderAt: string
			lastEntryAt: string
		}>(
			`
			SELECT *
			FROM customers
			WHERE 1=1 ${filterSQL} ${ageFilterSql} ${swimmingPoolsFilterSql}
			ORDER BY "${query.order}" ${query.direction} NULLS LAST
			LIMIT $limit
			OFFSET $offset;`,
			{
				bind: {
					limit,
					offset,
					...filterVariables,
				},
				raw: true,
				type: QueryTypes.SELECT,
			}
		)

		const customersCount = await sequelize.query<{ count: number }>(
			`
			SELECT
				COUNT(*) as "count"
			FROM customers
			WHERE 1=1 ${filterSQL} ${ageFilterSql} ${swimmingPoolsFilterSql}`,
			{
				bind: {
					...filterVariables,
				},
				raw: true,
				type: QueryTypes.SELECT,
			}
		)

		return res.json({
			customers: map(customers, (customer) => ({
				customerEmail:
					user.role === USER_ROLE.SWIMMING_POOL_OPERATOR
						? '*****'
						: customer.customerEmail,
				customerAges: customer.customerAges,
				customerZips: customer.customerZips,
				customerNames:
					user.role === USER_ROLE.SWIMMING_POOL_OPERATOR
						? '*****'
						: customer.customerNames,
				orderCount: customer.orderCount,
				lastOrderAt: customer.lastOrderAt,
				lastEntryAt: customer.lastEntryAt,
			})),
			pagination: {
				page: query.page,
				limit: query.limit,
				totalPages: Math.ceil(customersCount[0].count / limit) || 0,
				totalCount: customersCount[0].count,
			},
		})
	} catch (err) {
		return next(err)
	}
}
