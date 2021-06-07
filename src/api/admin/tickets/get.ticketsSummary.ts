import Joi from 'joi'
import { QueryTypes } from 'sequelize'
import { NextFunction, Request, Response } from 'express'
import sequelize, { models } from '../../../db/models'
import { getFilters } from '../../../utils/dbFilters';
import { concat, filter, map, reduce } from 'lodash';
import { ENTRY_TYPE } from '../../../utils/enums';
import { filtersSchema } from './get.tickets';

export const schema = Joi.object().keys({
	body: Joi.object(),
	query: Joi.object().keys({
		filters: filtersSchema
	}),
	params: Joi.object().keys({
		swimmingPoolId: Joi.string().guid({ version: ['uuidv4'] }).required()
	})
})

const {
	TicketType
} = models


export const workflow = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { query, params }: any = req
		const { limit, page } = query
		const offset = (limit * page) - limit

		const { ticketTypes, zip, age, numberOfVisits, ...otherFilters } = query.filters || {}

		let havingSQL = ''
		let havingVariables: any = {}

		if (numberOfVisits) {
			havingSQL += numberOfVisits.from ? ` AND COUNT(entries) >= $numberOfVisitsFrom ` : ''
			havingSQL += numberOfVisits.to ?  `AND COUNT(entries) <= $numberOfVisitsTo ` : ''
			havingVariables.numberOfVisitsFrom = numberOfVisits.from
			havingVariables.numberOfVisitsTo = numberOfVisits.to
		}

		const [ticketsFilterVariables, ticketsFilterSQL] = getFilters(otherFilters, "tickets")
		const [profilesFilterVariables, profilesFilterSQL] = getFilters({ zip, age }, "profiles")
		const [ticketTypesFilterVariables, ticketTypesFilterSQL] = getFilters({ id: ticketTypes }, "ticketTypes")

		const ticketsSales = await sequelize.query<{ ticketTypeId: string, amount: string, soldTickets: number }>(`
			SELECT 
				"ticketTypes".id as "ticketTypeId", COUNT(tickets.id) AS "soldTickets", SUM(tickets.price) AS "amount" 
			FROM "ticketTypes"
			INNER JOIN (
				SELECT 
					tickets.id, tickets.price, tickets."ticketTypeId", tickets."profileId" 
				FROM tickets 
				INNER JOIN ( 
					SELECT entries."ticketId" from entries
						where entries."swimmingPoolId" = $swimmingPoolId and entries."type" = $entryType
						group by DATE_TRUNC('day', entries.timestamp), entries."ticketId"
				) as entries 
					ON tickets.id = entries."ticketId"
				WHERE (tickets."deletedAt" IS NULL) ${ticketsFilterSQL}
				GROUP BY tickets.id
				HAVING 1=1 ${havingSQL}
			) as tickets 
				ON "ticketTypes".id = tickets."ticketTypeId" 
			INNER JOIN 
				profiles ON tickets."profileId" = profiles.id AND (profiles."deletedAt" IS NULL) 
			WHERE 1=1 ${profilesFilterSQL} ${ticketTypesFilterSQL}
			GROUP BY "ticketTypes".id;`,
			{
				bind: {
					swimmingPoolId: params.swimmingPoolId,
					entryType: ENTRY_TYPE.CHECKIN,
					...havingVariables,
					...ticketsFilterVariables,
					...profilesFilterVariables,
					...ticketTypesFilterVariables,
				},
				raw: true,
				type: QueryTypes.SELECT
			}
		)

		const allTicketTypes = await TicketType.findAll({
			paranoid: false
		})

		return res.json({
			summary: concat(
				map(allTicketTypes, (ticketType) => {

					const ticketSale = filter(ticketsSales, (sale) => (sale.ticketTypeId === ticketType.id))
					return {
						name: ticketType.name,
						amount: ticketSale.length > 0 && ticketSale[0].amount ? Number(ticketSale[0].amount) : 0.00,
						sold: ticketSale.length > 0 && ticketSale[0].soldTickets ? Number(ticketSale[0].soldTickets) : 0,
					}
				}),
				[{
					name: req.t('total'),
					amount: reduce(ticketsSales, (sum, sale) => {
						return sale.amount ? Number(sale.amount) + sum : sum
					}, 0),
					sold: reduce(ticketsSales, (sum, sale) => {
						return sale.soldTickets ? Number(sale.soldTickets) + sum : sum
					}, 0)
				}]
			)
		})
	} catch (err) {
		return next(err)
	}
}
