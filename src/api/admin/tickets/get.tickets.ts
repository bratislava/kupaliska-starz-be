import { TicketModel } from './../../../db/models/ticket'
import Joi from 'joi'
import { QueryTypes } from 'sequelize'
import { NextFunction, Request, Response } from 'express'
import sequelize from '../../../db/models'
import { getFilters } from '../../../utils/dbFilters'
import { map } from 'lodash'
import { ENTRY_TYPE } from '../../../utils/enums'

export const filtersSchema = Joi.object().keys({
	ticketTypes: Joi.object().keys({
		value: Joi.array()
			.min(1)
			.required()
			.items(
				Joi.string()
					.guid({ version: ['uuidv4'] })
					.required()
			),
		type: Joi.string().valid('in').default('in'),
	}),
	zip: Joi.object().keys({
		value: Joi.string().required(),
		type: Joi.string().valid('like', 'exact').default('like'),
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
	price: Joi.object().keys({
		from: Joi.number(),
		to: Joi.number().when('type', {
			is: Joi.valid('range'),
			then: Joi.when('from', {
				is: Joi.required(),
				otherwise: Joi.required(),
			}),
		}),
		type: Joi.string().valid('range').default('range'),
	}),
	numberOfVisits: Joi.object().keys({
		from: Joi.number(),
		to: Joi.number().when('type', {
			is: Joi.valid('range'),
			then: Joi.when('from', {
				is: Joi.required(),
				otherwise: Joi.required(),
			}),
		}),
		type: Joi.string().valid('range').default('range'),
	}),
	createdAt: Joi.object().keys({
		from: Joi.date(),
		to: Joi.date().when('type', {
			is: Joi.valid('range'),
			then: Joi.when('from', {
				is: Joi.required(),
				otherwise: Joi.required(),
			}),
		}),
		type: Joi.string().valid('range').default('range'),
		dataType: Joi.string().default('date'),
	}),
})

export const schema = Joi.object().keys({
	body: Joi.object(),
	query: Joi.object().keys({
		filters: filtersSchema,
		limit: Joi.number().integer().min(1).default(20).empty(['', null]),
		page: Joi.number().integer().min(1).default(1).empty(['', null]),
		order: Joi.string()
			.valid(
				'price',
				'numberOfVisits',
				'age',
				'zip',
				'ticketTypeName',
				'createdAt'
			)
			.empty(['', null])
			.default('createdAt'),
		direction: Joi.string()
			.lowercase()
			.valid('asc', 'desc')
			.empty(['', null])
			.default('desc'),
	}),
	params: Joi.object().keys({
		swimmingPoolId: Joi.string()
			.guid({ version: ['uuidv4'] })
			.required(),
	}),
})

export const workflow = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	try {
		const { query, params }: any = req
		const { limit, page } = query
		const offset = limit * page - limit

		const { ticketTypes, zip, age, numberOfVisits, ...otherFilters } =
			query.filters || {}

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

		if (query.order === 'ticketTypeName') {
			query.order = `ticketType.name`
		}
		if (query.order === 'age' || query.order === 'zip') {
			query.order = `profile.${query.order}`
		}

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

		let tickets = await sequelize.query<TicketModel>(
			`
			SELECT
				tickets.id, tickets.price as "price", tickets."isChildren", tickets."createdAt" as "createdAt", tickets."numberOfVisits" AS "numberOfVisits",
				profiles.id as "profile.id", profiles.age as "profile.age", profiles.zip as "profile.zip",
				"ticketTypes".id as "ticketType.id", "ticketTypes".name as "ticketType.name"
			FROM "ticketTypes"
			INNER JOIN (
				SELECT
					tickets.id, tickets.price, tickets."isChildren", tickets."createdAt", tickets."ticketTypeId", tickets."profileId", COUNT(visits) as "numberOfVisits"
				FROM tickets
				INNER JOIN (
					SELECT visits."ticketId" FROM visits
					WHERE
						"numberOfCheckIn" > 0
						AND "swimmingPoolId" = $swimmingPoolId
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
			ORDER BY "${query.order}" ${query.direction}
			LIMIT $limit
			OFFSET $offset;`,
			{
				bind: {
					limit: limit,
					offset: offset,
					swimmingPoolId: params.swimmingPoolId,
					...havingVariables,
					...ticketsFilterVariables,
					...profilesFilterVariables,
					...ticketTypesFilterVariables,
					...ageFilterVariables,
				},
				model: TicketModel,
				raw: true,
				mapToModel: true,
				nest: true,
				type: QueryTypes.SELECT,
			}
		)

		const ticketsCount = await sequelize.query<{ count: number }>(
			`
			SELECT
				COUNT(*) as "count"
			FROM "ticketTypes"
			INNER JOIN (
				SELECT
					tickets.id, tickets."ticketTypeId", tickets."profileId"
				FROM tickets
				INNER JOIN (
					SELECT visits."ticketId" FROM visits
					WHERE
						"numberOfCheckIn" > 0
						AND "swimmingPoolId" = $swimmingPoolId
				) as visits
					ON tickets.id = visits."ticketId"
				WHERE (tickets."deletedAt" IS NULL) ${ticketsFilterSQL}
				GROUP BY tickets.id
				HAVING 1=1 ${havingSQL}
			) as tickets
				ON "ticketTypes".id = tickets."ticketTypeId"
			INNER JOIN
				profiles ON tickets."profileId" = profiles.id AND (profiles."deletedAt" IS NULL)
			WHERE 1=1 ${profilesFilterSQL} ${ticketTypesFilterSQL} ${ageFilterSql};`,
			{
				bind: {
					swimmingPoolId: params.swimmingPoolId,
					...havingVariables,
					...ticketsFilterVariables,
					...profilesFilterVariables,
					...ticketTypesFilterVariables,
					...ageFilterVariables,
				},
				raw: true,
				nest: true,
				type: QueryTypes.SELECT,
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
					createdAt: ticket.createdAt,
				}
			}),
			pagination: {
				page: query.page,
				limit: query.limit,
				totalPages: Math.ceil(ticketsCount[0].count / limit) || 0,
				totalCount: ticketsCount[0].count,
			},
		})
	} catch (err) {
		return next(err)
	}
}
