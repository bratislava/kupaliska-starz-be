
import { map } from "lodash";
import sequelize from "sequelize";
import { Op } from "sequelize";

/**
 * Returns variables for SQL binding and raw SQL. There are 3 types of filters available.
 * `exact` - match string exactly
 * `like` - use ilike
 * `range` - match value between two values (from and to)
 * `in` - IN operator
 *
 * @example
 * // returns [{ ageFrom: 5, name: '%example%', 'state0': 'active'  }, 'AND "profile"."age" >= $ageFrom AND "profile"."name" ILIKE $name AMD "profile"."state" IN ($state0)'  ]
 * getFilters(
 * 	{
 * 		age: {
 * 			type: "range",
 * 			from: 5,
 *  	},
 *  	name: {
 * 			type: "like",
 * 			value: 'example',
 *  	},
 *  *  	state: {
 * 			type: "in",
 * 			value: ['active'],
 *  	}
 * 	}, 'profile'
 * );
 *
 * @param filters Object containing filters.
 * @param tablePrefix Table prefix
 */
export const getFilters = (filters: any, tablePrefix = '', func = '') => {
	let filterVariables = {} as any
	const filterSQL = Object.keys(filters || {}).map((filterName) => {

		if (filters[filterName] === undefined) return ''

		const tablePrefixString = tablePrefix ? `"${tablePrefix}".` : ''

		if (filters[filterName].type === 'exact') {
			filterVariables = {
				[filterName]: filters[filterName].value,
				...filterVariables
			}
			return `AND ${tablePrefixString}"${filterName}" = $${filterName}`
		}

		if (filters[filterName].type === 'like') {
			filters[filterName].value = `%${filters[filterName].value}%`
			filterVariables = {
				[filterName]: filters[filterName].value,
				...filterVariables
			}
			return `AND ${tablePrefixString}"${filterName}" ILIKE $${filterName}`
		}

		if (filters[filterName].type === 'range') {
			filterVariables = {
				[`${filterName}From`]: filters[filterName].from ? filters[filterName].from : undefined,
				[`${filterName}To`]: filters[filterName].to ? filters[filterName].to : undefined,
				...filterVariables
			}
			const column = filters[filterName].dataType === 'date'
				? `CAST(${tablePrefixString}"${filterName}" as date)`
				: `${tablePrefixString}"${filterName}"`

			return (filters[filterName].from ? `AND ${column} >= $${`${filterName}From`} ` : '')
				+ (filters[filterName].to ? `AND ${column} <= $${`${filterName}To`}` : '')
		}

		if (filters[filterName].type === 'in') {

			for (const [i, value] of filters[filterName].value.entries()) {
				filterVariables[`${filterName}${i}`] = value
			}

			const filterIds = map(filters[filterName].value, (_value, index) => (`$${filterName}${index}`)).join(',')
			return `AND ${tablePrefixString}"${filterName}" IN (${filterIds})`
		}
		return ''
	}).join(' ');

	return [filterVariables, filterSQL]
}

/**
 * Returns array of sequelize conditions. There are 4 types of filters available.
 * `exact` - match string exactly
 * `like` - use ilike
 * `range` - match value between two values (from and to)
 * `in` - IN operator
 *
 * @example
 * getFilters(
 * 	{
 * 		age: {
 * 			type: "range",
 * 			from: 5,
 *  	},
 *  	name: {
 * 			type: "like",
 * 			value: 'example',
 *  	},
 *   	state: {
 * 			type: "in",
 * 			value: ['new', 'old'],
 *  	}
 * 	}, 'profile'
 * );
 *
 * @param filters Object containing filters.
 * @param tablePrefix Table prefix. Used only for ranges filters with dataType `date`.
 *
 */
export const getSequelizeFilters = (filters: any, tablePrefix ='') => {

	return Object.keys(filters || {}).map((filterName) => {

		if (filters[filterName] === undefined) return {}


		if (filters[filterName].type === 'exact') {

			return {
				[filterName]: {
					[Op.eq]: filters[filterName].value
				}
			}
		}
		if (filters[filterName].type === 'like') {
			return {
				[filterName]: {
					[Op.iLike]: `%${filters[filterName].value}%`
				}
			}
		}

		if (filters[filterName].type === 'range') {
			const tablePrefixString = tablePrefix ? `"${tablePrefix}".` : ''

			const from = filters[filterName].from ? ({ [Op.gte]: filters[filterName].from }) : undefined
			const to = filters[filterName].to ? ({ [Op.lte]: filters[filterName].to }) : undefined

			return sequelize.where(
				(filters[filterName].dataType === 'date'
					? sequelize.cast(sequelize.col(`${tablePrefixString}${filterName}`), 'date')
					: filterName),
				{
					...from,
					...to
				}
			)
		}

		if (filters[filterName].type === 'in') {
			return {
				[filterName]: {
					[Op.in]: filters[filterName].value,
				}
			}
		}
		return {}
	})
}
