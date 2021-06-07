import { TicketModel } from './../../../db/models/ticket';
import Joi from 'joi'
import { QueryTypes } from 'sequelize'
import { NextFunction, Request, Response } from 'express'
import sequelize, { models } from '../../../db/models'
import { getFilters } from '../../../utils/dbFilters';
import { map } from 'lodash';
import { ENTRY_TYPE } from '../../../utils/enums';

export const filtersSchema = Joi.object().keys({
	ticketTypes: Joi.object().keys({
		value: Joi.array().min(1).required().items(Joi.string().guid({ version: ['uuidv4'] }).required()),
		type: Joi.string().valid('in').default('in')
	}),
	zip: Joi.object().keys({
		value: Joi.string().required(),
		type: Joi.string().valid('like', 'exact').default('like')
	}),
	age: Joi.object().keys({
		from: Joi.number(),
		to: Joi.number().when('type', { is: Joi.valid('range'), then: Joi.when('from', { is: Joi.required(), otherwise: Joi.required() }) }),
		type: Joi.string().valid('range').default('range')
	}),
	price: Joi.object().keys({
		from: Joi.number(),
		to: Joi.number().when('type', { is: Joi.valid('range'), then: Joi.when('from', { is: Joi.required(), otherwise: Joi.required() }) }),
		type: Joi.string().valid('range').default('range')
	}),
	numberOfVisits: Joi.object().keys({
		from: Joi.number(),
		to: Joi.number().when('type', { is: Joi.valid('range'), then: Joi.when('from', { is: Joi.required(), otherwise: Joi.required() }) }),
		type: Joi.string().valid('range').default('range')
	}),
	createdAt: Joi.object().keys({
		from: Joi.date(),
		to: Joi.date().when('type', { is: Joi.valid('range'), then: Joi.when('from', { is: Joi.required(), otherwise: Joi.required() }) }),
		type: Joi.string().valid('range').default('range')
	})
})

export const schema = Joi.object().keys({
	body: Joi.object(),
	query: Joi.object().keys({
		filters: filtersSchema,
		limit: Joi.number().integer().min(1).default(20).empty(['', null]),
		page: Joi.number().integer().min(1).default(1).empty(['', null]),
		order: Joi.string().valid(
			'price',
			'numberOfVisits',
			'age',
			'zip',
			'ticketTypeName',
			'createdAt',
		).empty(['', null]).default('createdAt'),
		direction: Joi.string().lowercase().valid('asc', 'desc').empty(['', null]).default('desc')
		}),
	params: Joi.object().keys({
		swimmingPoolId: Joi.string().guid({ version: ['uuidv4'] }).required()
	})
})

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
			havingSQL += numberOfVisits.to ? `AND COUNT(entries) <= $numberOfVisitsTo ` : ''
			havingVariables.numberOfVisitsFrom = numberOfVisits.from
			havingVariables.numberOfVisitsTo = numberOfVisits.to
		}

		if (query.order === 'ticketTypeName') {
			query.order = `ticketType.name`
		}
		if (query.order === 'age' || query.order === 'zip') {
			query.order = `profile.${query.order}`
		}

		const [ticketsFilterVariables, ticketsFilterSQL] = getFilters(otherFilters, "tickets")
		const [profilesFilterVariables, profilesFilterSQL] = getFilters({ zip, age }, "profiles")
		const [ticketTypesFilterVariables, ticketTypesFilterSQL] = getFilters({ id: ticketTypes }, "ticketTypes")

		let tickets = await sequelize.query<TicketModel>(`
			SELECT 
				tickets.id, tickets.price as "price", tickets."isChildren", tickets."createdAt" as "createdAt", tickets."numberOfVisits" AS "numberOfVisits", 
				profiles.id as "profile.id", profiles.age as "profile.age", profiles.zip as "profile.zip",
				"ticketTypes".id as "ticketType.id", "ticketTypes".name as "ticketType.name"
			FROM "ticketTypes"
			INNER JOIN (
				SELECT 
					tickets.id, tickets.price, tickets."isChildren", tickets."createdAt", tickets."ticketTypeId", tickets."profileId", COUNT(entries) as "numberOfVisits"
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
			ORDER BY "${query.order}" ${query.direction}
			LIMIT $limit
			OFFSET $offset;`,
			{
				bind: {
					limit: limit,
					offset: offset,
					swimmingPoolId: params.swimmingPoolId,
					entryType: ENTRY_TYPE.CHECKIN,
					...havingVariables,
					...ticketsFilterVariables,
					...profilesFilterVariables,
					...ticketTypesFilterVariables,
				},
				model: TicketModel,
				raw: true,
				mapToModel: true,
				nest: true,
				type: QueryTypes.SELECT,
			}
		)

		const ticketsCount = await sequelize.query<{ count: number }>(`
			SELECT 
				COUNT(*) as "count"
			FROM "ticketTypes"
			INNER JOIN (
				SELECT 
					tickets.id, tickets."ticketTypeId", tickets."profileId" 
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
			WHERE 1=1 ${profilesFilterSQL} ${ticketTypesFilterSQL};`,
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
				nest: true,
				type: QueryTypes.SELECT
			}
		)

		return res.json({
			tickets: map(tickets, (ticket) => {
				return {
					id: ticket.id,
					ticketTypeName: ticket.ticketType.name,
					price: Number(ticket.price),
					isChildren: ticket.isChildren,
					age: ticket.profile.age ? ticket.profile.age : null,
					zip: ticket.profile.zip ? ticket.profile.zip : null,
					numberOfVisits: ticket.numberOfVisits,
					createdAt: ticket.createdAt
				}
			}),
			pagination: {
				page: query.page,
				limit: query.limit,
				totalPages: Math.ceil(ticketsCount[0].count / limit) || 0,
				totalCount: ticketsCount[0].count
			}
		})
	} catch (err) {
		return next(err)
	}
}
