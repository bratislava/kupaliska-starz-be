import { map } from 'lodash'
import { QueryInterface } from 'sequelize'

export const checkTableExists = async (queryInterface: QueryInterface, table: string) => {
	const tables: any = await queryInterface.showAllTables()
	return tables.find((item: string) => item === table)
}

export const getActualTime = (): string => {
	const now = new Date()
	return `${("0" + now.getHours()).slice(-2)}:${("0" + now.getMinutes()).slice(-2)}`;
}

export const getHours = (time: string): number => {
	return Number(time.substr(0, 2))
}

export const getMinutes = (time: string): number => {
	return Number(time.substr(3, 2))
}

export const getAllAges = (ageInterval: number, ageMinimum: number) => {
	const allAges = map( [...Array(Math.ceil(100 / ageInterval) - 1).keys()], (index) => {
		const min = index * ageInterval + ageMinimum
		const max = index * ageInterval + (ageInterval - 1) + ageMinimum
		return `${min}-${max}`
	})
	allAges.push(null) // needed when age is not filled (SQL returns null value)

	return allAges
}
