import { formatVisits } from './../../../utils/formatters'
import Joi from 'joi'
import { Op, QueryTypes } from 'sequelize'
import { NextFunction, Request, Response } from 'express'
import sequelize from '../../../db/models'
import { groupBy, reduce } from 'lodash'
import joiDate from '@joi/date'
import { getFilters } from '../../../utils/dbFilters'
import { SwimmingPoolModel } from '../../../db/models/swimmingPool'
import { getAllAges } from '../../../utils/helpers'

const JoiDateExtension = Joi.extend(joiDate(Joi))

export const schema = Joi.object().keys({
	body: Joi.object(),
	query: Joi.object().keys({
		ageInterval: Joi.number().default(10),
		ageMinimum: Joi.number().default(0),
		from: JoiDateExtension.date().format(['YYYY-MM-DD']).raw().required(),
		to: JoiDateExtension.date().format(['YYYY-MM-DD']).raw().required(),
		swimmingPools: Joi.array()
			.min(1)
			.required()
			.items(
				Joi.string()
					.guid({ version: ['uuidv4'] })
					.required()
			),
	}),
	params: Joi.object().keys(),
})

export const workflow = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	try {
		const { query }: any = req

		const [swimmingPoolsFilterVariables, swimmingPoolsFilterSql] =
			getFilters({
				swimmingPoolId: { type: 'in', value: query.swimmingPools },
			})

		const fromSqlQuery = `
			SELECT *
			FROM
				visits
			WHERE
				CAST(day as DATE) >= $from AND CAST(day as DATE) <= $to
				AND "numberOfCheckIn" > 0 ${swimmingPoolsFilterSql}`

		const joinAgeIntervalsSqlQuery = `
			SELECT
				(ten * $ageInterval + $ageMinimum)::text||'-'||(ten * $ageInterval + ($ageInterval - 1) + $ageMinimum)::text AS range,
				ten * $ageInterval + $ageMinimum AS r_min, ten * $ageInterval + ($ageInterval - 1) + $ageMinimum AS r_max
			FROM generate_series(0, CAST(CEIL(100 / $ageInterval) - 1 AS INTEGER) ) AS t(ten)`

		const swimmingPoolsResult = await sequelize.query<{
			id: string
			range: { age: string; value: string }
		}>(
			`
			SELECT "swimmingPoolId" as "id", ranges.range as "range.age", COUNT(*) as "range.value"
			FROM
				(${fromSqlQuery}) as "entries"
			LEFT JOIN
				tickets ON tickets.id = entries."ticketId"
			LEFT JOIN
				profiles ON tickets."profileId" = profiles.id
			LEFT JOIN
				(${joinAgeIntervalsSqlQuery}) as ranges
				ON profiles.age BETWEEN ranges.r_min and ranges.r_max
			GROUP BY "swimmingPoolId", ranges.range, ranges.r_min
			ORDER BY "swimmingPoolId", ranges.r_min
			`,
			{
				bind: {
					ageInterval: query.ageInterval,
					ageMinimum: query.ageMinimum,
					from: query.from,
					to: query.to,
					...swimmingPoolsFilterVariables,
				},
				raw: true,
				nest: true,
				type: QueryTypes.SELECT,
			}
		)

		const swimmingPoolsAverageUniqueVisitsResult = await sequelize.query<{
			id: string
			total: string
		}>(
			`
			SELECT "swimmingPoolId" as "id", COUNT(*) as "total"
			FROM
				(${fromSqlQuery}) as "entries"
			GROUP BY "swimmingPoolId"
			ORDER BY "swimmingPoolId"`,
			{
				bind: {
					from: query.from,
					to: query.to,
					...swimmingPoolsFilterVariables,
				},
				raw: true,
				nest: true,
				type: QueryTypes.SELECT,
			}
		)

		const agesAverageUniqueVisitsResult = await sequelize.query<{
			age: string
			total: string
		}>(
			`
			SELECT ranges.range as "age", COUNT(*) as "total"
			FROM
				(${fromSqlQuery}) as "entries"
			LEFT JOIN
				tickets ON tickets.id = entries."ticketId"
			LEFT JOIN
				profiles ON tickets."profileId" = profiles.id
			LEFT JOIN
				(${joinAgeIntervalsSqlQuery}) as ranges
				ON profiles.age BETWEEN ranges.r_min and ranges.r_max
			GROUP BY ranges.range, ranges.r_min
			ORDER BY ranges.r_min
		`,
			{
				bind: {
					ageInterval: query.ageInterval,
					ageMinimum: query.ageMinimum,
					from: query.from,
					to: query.to,
					...swimmingPoolsFilterVariables,
				},
				raw: true,
				nest: true,
				type: QueryTypes.SELECT,
			}
		)

		const allSwimmingPools = await SwimmingPoolModel.findAll({
			where: {
				id: {
					[Op.in]: query.swimmingPools,
				},
			},
		})

		const allAges = getAllAges(query.ageInterval, query.ageMinimum)
		const swimmingPoolsVisits = groupBy(swimmingPoolsResult, 'id')

		return res.json({
			data: {
				swimmingPools: formatVisits(
					allSwimmingPools,
					allAges,
					swimmingPoolsVisits,
					swimmingPoolsAverageUniqueVisitsResult
				),
				ages: reduce(
					agesAverageUniqueVisitsResult,
					(allRanges, range) => {
						let ageTitle = range.age
						if (range.age === null) {
							ageTitle = req.t('none')
						}
						allRanges[ageTitle] = range.total
						return allRanges
					},
					{} as any
				),
			},
		})
	} catch (err) {
		return next(err)
	}
}
