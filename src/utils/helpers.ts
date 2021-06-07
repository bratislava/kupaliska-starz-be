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
