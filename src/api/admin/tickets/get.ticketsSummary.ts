import Joi from 'joi'
import { Op, QueryTypes } from 'sequelize'
import { NextFunction, Request, Response } from 'express'
import sequelize, { models } from '../../../db/models'
import { getFilters } from '../../../utils/dbFilters'
import { concat, filter, map, reduce } from 'lodash'
import { ENTRY_TYPE } from '../../../utils/enums'
import { filtersSchema } from './get.tickets'

export const schema = Joi.object().keys({
	body: Joi.object(),
	query: Joi.object().keys({
		filters: filtersSchema,
	}),
	params: Joi.object().keys({
		swimmingPoolId: Joi.string()
			.guid({ version: ['uuidv4'] })
			.required(),
	}),
})

const { TicketType } = models

export const workflow = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	try {
		const { query, params }: any = req

		const {
			ticketTypes,
			zip,
			age,
			createdAt,
			numberOfVisits,
			...otherFilters
		} = query.filters || {}

		let havingSQL = ''
		let havingVariables: any = {}

		if (numberOfVisits) {
			havingSQL += numberOfVisits.from
				? ` AND COUNT(visits) >= $numberOfVisitsFrom `
				: ''
			havingSQL += numberOfVisits.to
				? `AND COUNT(visits) <= $numberOfVisitsTo `
				: ''
			havingVariables.numberOfVisitsFrom = numberOfVisits.from
			havingVariables.numberOfVisitsTo = numberOfVisits.to
		}

		const [visitsFilterVariables, visitsFilterSql] = getFilters({
			day: createdAt,
		})
		const [ticketsFilterVariables, ticketsFilterSQL] = getFilters(
			otherFilters,
			'tickets'
		)
		const [profilesFilterVariables, profilesFilterSQL] = getFilters(
			{ zip },
			'profiles'
		)
		const [ticketTypesFilterVariables, ticketTypesFilterSQL] = getFilters(
			{ id: ticketTypes },
			'ticketTypes'
		)

		let ageFilterSql = ''
		let ageFilterVariables = {}
		if (age) {
			ageFilterSql += age.from ? `"profiles"."age" >= $ageFrom` : ''
			const addAnd = age.from ? 'AND' : ''
			ageFilterSql += age.to
				? ` ${addAnd} "profiles"."age" <= $ageTo`
				: ''
			ageFilterSql = age.showUnspecified
				? `(${ageFilterSql} OR "profiles"."age" IS NULL)`
				: ageFilterSql

			ageFilterVariables = {
				[`ageFrom`]: age.from ? age.from : undefined,
				[`ageTo`]: age.to ? age.to : undefined,
			}

			ageFilterSql = `AND ${ageFilterSql}`
		}

		const ticketsSales = await sequelize.query<{
			ticketTypeId: string
			amount: string
			soldTickets: number
		}>(
			`
			SELECT
				"ticketTypes".id as "ticketTypeId", COUNT(tickets.id) AS "soldTickets", SUM(tickets.price) AS "amount"
			FROM "ticketTypes"
			INNER JOIN (
				SELECT
					tickets.id, tickets.price, tickets."ticketTypeId", tickets."profileId"
				FROM tickets
				INNER JOIN (
					SELECT visits."ticketId" FROM visits
					WHERE
						"numberOfCheckIn" > 0
						AND "swimmingPoolId" = $swimmingPoolId
						${visitsFilterSql}
				) as visits
					ON tickets.id = visits."ticketId"
				WHERE (tickets."deletedAt" IS NULL) ${ticketsFilterSQL}
				GROUP BY tickets.id
				HAVING 1=1 ${havingSQL}
			) as tickets
				ON "ticketTypes".id = tickets."ticketTypeId"
			INNER JOIN
				profiles ON tickets."profileId" = profiles.id AND (profiles."deletedAt" IS NULL)
			WHERE 1=1 ${profilesFilterSQL} ${ticketTypesFilterSQL} ${ageFilterSql}
			GROUP BY "ticketTypes".id;`,
			{
				bind: {
					swimmingPoolId: params.swimmingPoolId,
					...havingVariables,
					...ticketsFilterVariables,
					...profilesFilterVariables,
					...ticketTypesFilterVariables,
					...ageFilterVariables,
					...visitsFilterVariables,
				},
				raw: true,
				type: QueryTypes.SELECT,
			}
		)

		let where = {} as any
		if (ticketTypes && ticketTypes.value.length > 0) {
			where.id = {
				[Op.in]: ticketTypes.value,
			}
		}

		const allTicketTypes = await TicketType.findAll({
			where,
			paranoid: false,
		})

		return res.json({
			summary: concat(
				map(allTicketTypes, (ticketType) => {
					const ticketSale = filter(
						ticketsSales,
						(sale) => sale.ticketTypeId === ticketType.id
					)
					return {
						name: ticketType.name,
						amount:
							ticketSale.length > 0 && ticketSale[0].amount
								? Number(ticketSale[0].amount)
								: 0.0,
						sold:
							ticketSale.length > 0 && ticketSale[0].soldTickets
								? Number(ticketSale[0].soldTickets)
								: 0,
					}
				}),
				[
					{
						name: req.t('total'),
						amount: reduce(
							ticketsSales,
							(sum, sale) => {
								return sale.amount
									? Number(sale.amount) + sum
									: sum
							},
							0
						),
						sold: reduce(
							ticketsSales,
							(sum, sale) => {
								return sale.soldTickets
									? Number(sale.soldTickets) + sum
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
