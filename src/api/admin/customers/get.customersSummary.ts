import Joi from 'joi'
import { QueryTypes } from 'sequelize'
import { NextFunction, Request, Response } from 'express'
import sequelize from '../../../db/models'

export const schema = Joi.object().keys({
	body: Joi.object(),
	query: Joi.object().keys(),
	params: Joi.object()
})

export const workflow = async (req: Request, res: Response, next: NextFunction) => {
	try {

		const customersCount = await sequelize.query<{ count: number}>(
			`SELECT
				COUNT(*) as "count"
				FROM (
					SELECT
						"profile"."email" AS "customerEmail"
					FROM "tickets" AS "ticket"
					LEFT OUTER JOIN "profiles" AS "profile" ON "ticket"."profileId" = "profile"."id" AND ("profile"."deletedAt" IS NULL)
					WHERE ("ticket"."deletedAt" IS NULL)
					GROUP BY "profile"."email"
				) as "subq;"`,
			{
				raw: true,
				type: QueryTypes.SELECT,
		});

		const mostFrequentZipCode = await sequelize.query<{ frequentZip: string, zipFrequency: number}>(
			`SELECT
				TRIM(zip) as "frequentZip", COUNT(TRIM(zip)) as "zipFrequency"
			FROM "tickets" AS "ticket"
			LEFT OUTER JOIN "profiles" AS "profile" ON "ticket"."profileId" = "profile"."id" AND ("profile"."deletedAt" IS NULL)
			WHERE ("ticket"."deletedAt" IS NULL)
			GROUP BY TRIM(zip) ORDER by "zipFrequency" DESC
			OFFSET 0 LIMIT 1;`,
			{
				raw: true,
				type: QueryTypes.SELECT,
		});

		const statistics = await sequelize.query<{ maxCustomerAge: number, minCustomerAge: number, averageCustomerAge: string, ticketCount: number}>(
			`SELECT
				MAX(age) as "maxCustomerAge", MIN(age) as "minCustomerAge", ROUND(AVG(age), 2) as "averageCustomerAge", COUNT(*) as "ticketCount"
			FROM "tickets" AS "ticket"
			LEFT OUTER JOIN "profiles" AS "profile" ON "ticket"."profileId" = "profile"."id" AND ("profile"."deletedAt" IS NULL)
			WHERE ("ticket"."deletedAt" IS NULL);`,
			{
				raw: true,
				type: QueryTypes.SELECT,
		});

		const orderStatistics = await sequelize.query<{ maxNumberOfOrders: number, averageNumberOfOrders: string}>(
			`SELECT
				MAX("orderCount") as "maxNumberOfOrders", ROUND(AVG("orderCount"), 2) as "averageNumberOfOrders"
				FROM (
					SELECT
						"profile"."email" AS "customerEmail",
						COUNT("order"."id") AS "orderCount"
					FROM "tickets" AS "ticket"
					LEFT OUTER JOIN "profiles" AS "profile" ON "ticket"."profileId" = "profile"."id" AND ("profile"."deletedAt" IS NULL)
					LEFT OUTER JOIN "orders" AS "order" ON "ticket"."orderId" = "order"."id" AND ("order"."deletedAt" IS NULL)
					WHERE ("ticket"."deletedAt" IS NULL)
					GROUP BY "profile"."email"
				) as "subq";`,
			{
				raw: true,
				type: QueryTypes.SELECT,
		});

		return res.json({
			customerCount: customersCount[0].count,
			maxCustomerAge: statistics[0].maxCustomerAge,
			minCustomerAge: statistics[0].minCustomerAge,
			averageCustomerAge: Number(statistics[0].averageCustomerAge),
			ticketCount: statistics[0].ticketCount,
			mostFrequentZipCode: mostFrequentZipCode[0].frequentZip,
			zipCodeFrequency: mostFrequentZipCode[0].zipFrequency,
			maxNumberOfOrders: orderStatistics[0].maxNumberOfOrders,
			averageNumberOfOrders: Number(orderStatistics[0].averageNumberOfOrders),
		})
	} catch (err) {
		return next(err)
	}
}
