import Joi from 'joi'
import { QueryTypes } from 'sequelize'
import { NextFunction, Request, Response } from 'express'
import sequelize from '../../../db/models'
import { USER_ROLE } from '../../../utils/enums'
import { map } from 'lodash'
import { UserModel } from '../../../db/models/user'

export const schema = Joi.object().keys({
	body: Joi.object(),
	query: Joi.object().keys(),
	params: Joi.object(),
})

export const workflow = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	try {
		const user = req.user as UserModel

		let filterVariables: any = {}
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

		const customersCount = await sequelize.query<{ count: number }>(
			`
            SELECT
				COUNT(*) as "count"
			FROM customers
            WHERE 1=1 ${swimmingPoolsFilterSql} `,
			{
				raw: true,
				type: QueryTypes.SELECT,
				bind: {
					...filterVariables,
				},
			}
		)

		const mostFrequentZipCode = await sequelize.query<{
			frequentZip: string
			zipFrequency: number
		}>(
			`
            SELECT
                "zip" as "frequentZip", COUNT(zip) as "zipFrequency"
            FROM
                (
                    SELECT unnest("customerZipsArr") as "zip"
                    FROM customers
                    WHERE 1=1 ${swimmingPoolsFilterSql}
                ) as "subq"
            GROUP BY "subq"."zip" ORDER BY "zipFrequency" DESC
            OFFSET 0 LIMIT 1`,
			{
				raw: true,
				type: QueryTypes.SELECT,
				bind: {
					...filterVariables,
				},
			}
		)

		const statistics = await sequelize.query<{
			maxCustomerAge: number
			minCustomerAge: number
			averageCustomerAge: string
			ticketCount: number
		}>(
			`
            SELECT 
                MAX(age) as "maxCustomerAge", MIN(age) as "minCustomerAge", ROUND(AVG(age), 2) as "averageCustomerAge",
                (SELECT SUM("numberOfTickets") FROM customers)::integer as "ticketCount"
            FROM
                (
                    SELECT unnest("customerAgesArr") as "age"
                    FROM customers
                    WHERE 1=1 ${swimmingPoolsFilterSql}
                ) as "subq"`,
			{
				raw: true,
				type: QueryTypes.SELECT,
				bind: {
					...filterVariables,
				},
			}
		)

		const orderStatistics = await sequelize.query<{
			maxNumberOfOrders: number
			averageNumberOfOrders: string
		}>(
			`
            SELECT
                MAX("orderCount") as "maxNumberOfOrders", ROUND(AVG("orderCount"), 2) as "averageNumberOfOrders"
            FROM customers
            WHERE 1=1 ${swimmingPoolsFilterSql}`,
			{
				raw: true,
				type: QueryTypes.SELECT,
				bind: {
					...filterVariables,
				},
			}
		)

		return res.json({
			customerCount: customersCount[0].count,
			maxCustomerAge: statistics[0].maxCustomerAge,
			minCustomerAge: statistics[0].minCustomerAge,
			averageCustomerAge: Number(statistics[0].averageCustomerAge),
			ticketCount: statistics[0].ticketCount,
			mostFrequentZipCode: mostFrequentZipCode[0].frequentZip,
			zipCodeFrequency: mostFrequentZipCode[0].zipFrequency,
			maxNumberOfOrders: orderStatistics[0].maxNumberOfOrders,
			averageNumberOfOrders: Number(
				orderStatistics[0].averageNumberOfOrders
			),
		})
	} catch (err) {
		return next(err)
	}
}
