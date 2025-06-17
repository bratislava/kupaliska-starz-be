import Joi from 'joi'
import { QueryTypes } from 'sequelize'
import { NextFunction, Request, Response } from 'express'
import sequelize, { models } from '../../../db/models'
import { concat, filter, map, reduce } from 'lodash'
import { getFilters } from '../../../utils/dbFilters'
import { filtersSchema } from './get.orders'

export const schema = Joi.object().keys({
	body: Joi.object(),
	query: Joi.object().keys({
		filters: filtersSchema,
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
		const { swimmingPools, ticketTypes, email, ...otherFilters } =
			query.filters || {}

		const [ordersFilterVariables, ordersFilterSQL] = getFilters(
			otherFilters || {},
			'orders'
		)
		const [profilesFilterVariables, profilesFilterSQL] = getFilters(
			email ? { email } : {},
			'profiles'
		)
		const [ticketTypesFilterVariables, ticketTypesFilterSQL] = getFilters(
			ticketTypes ? { id: ticketTypes } : {},
			'ticketTypes'
		)
		const [swimmingPoolsFilterVariables, swimmingPoolsFilterSQL] =
			getFilters(
				swimmingPools ? { swimmingPoolId: swimmingPools } : {},
				'swimmingPoolTicketType'
			)

		const ticketTypesSales = await sequelize.query<{
			ticketTypeId: string
			amount: string
		}>(
			`
			SELECT
				subq.ttid as "ticketTypeId", ROUND(SUM(subq."priceWithVat"), 2) as "amount"
			FROM (
				SELECT
					DISTINCT ON (orders.id) orders.id, tickets.id, orders."priceWithVat", "ticketTypes".id as ttid from "ticketTypes"
				LEFT JOIN tickets ON tickets."ticketTypeId" = "ticketTypes".id AND (tickets."deletedAt" IS NULL)
				LEFT JOIN profiles ON tickets."profileId" = profiles.id AND (profiles."deletedAt" IS NULL)
				LEFT JOIN orders ON orders.id = tickets."orderId" AND (orders."deletedAt" IS NULL)
				LEFT JOIN "swimmingPoolTicketType" ON "swimmingPoolTicketType"."ticketTypeId" = "ticketTypes"."id"
				WHERE 1=1 ${ordersFilterSQL} ${profilesFilterSQL} ${ticketTypesFilterSQL} ${swimmingPoolsFilterSQL}
			) as subq
			GROUP BY subq.ttid`,
			{
				bind: {
					...ordersFilterVariables,
					...profilesFilterVariables,
					...ticketTypesFilterVariables,
					...swimmingPoolsFilterVariables,
				},
				raw: true,
				type: QueryTypes.SELECT,
			}
		)

		const allTicketTypes = await TicketType.findAll({
			paranoid: false,
		})

		return res.json({
			summary: concat(
				map(ticketTypesSales, (ticketTypeSale) => {
					const ticketType = allTicketTypes.find(
						(ticketType) =>
							ticketType.id === ticketTypeSale.ticketTypeId
					)
					return {
						name: ticketType?.name || '',
						amount: Number(ticketTypeSale.amount),
					}
				}),
				[
					{
						name: req.t('totalAmount'),
						amount: reduce(
							ticketTypesSales,
							(sum, sale) => {
								return sale.amount
									? Number(sale.amount) + sum
									: sum
							},
							0
						),
					},
				]
			),
		})
	} catch (err) {
		return next(err)
	}
}
