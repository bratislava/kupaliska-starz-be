
import { map } from "lodash";
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
export const getFilters = (filters: any, tablePrefix = '') => {
	let filterVariables = {} as any
	const filterSQL = Object.keys(filters || {}).map((filterName) => {

		if (filters[filterName] === undefined) return ''

		if (filters[filterName].type === 'exact') {
			filterVariables = {
				[filterName]: filters[filterName].value,
				...filterVariables
			}
			const tablePrefixString = tablePrefix ? `"${tablePrefix}".` : ''
			return `AND ${tablePrefixString}"${filterName}" = $${filterName}`
		}

		if (filters[filterName].type === 'like') {
			filters[filterName].value = `%${filters[filterName].value}%`
			filterVariables = {
				[filterName]: filters[filterName].value,
				...filterVariables
			}
			const tablePrefixString = tablePrefix ? `"${tablePrefix}".` : ''
			return `AND ${tablePrefixString}"${filterName}" ILIKE $${filterName}`
		}

		if (filters[filterName].type === 'range') {
			filterVariables = {
				[`${filterName}From`]: filters[filterName].from ? filters[filterName].from : undefined,
				[`${filterName}To`]: filters[filterName].to ? filters[filterName].to : undefined,
				...filterVariables
			}
			const tablePrefixString = tablePrefix ? `"${tablePrefix}".` : ''
			return (filters[filterName].from ? `AND ${tablePrefixString}"${filterName}" >= $${`${filterName}From`} ` : '')
				+ (filters[filterName].to ? `AND ${tablePrefixString}"${filterName}" <= $${`${filterName}To`}` : '')
		}

		if (filters[filterName].type === 'in') {

			for (const [i, value] of filters[filterName].value.entries()) {
				filterVariables[`${filterName}${i}`] = value
			}

			const tablePrefixString = tablePrefix ? `"${tablePrefix}".` : ''
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
 */
export const getSequelizeFilters = (filters: any) => {

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
			const from = filters[filterName].from ? ({ [Op.gte]: filters[filterName].from }) : undefined
			const to = filters[filterName].to ? ({ [Op.lte]: filters[filterName].to }) : undefined
			return {
				[filterName]: {
					...from,
					...to
				}
			}
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
