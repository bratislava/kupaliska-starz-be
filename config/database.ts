import 'dotenv/config'
import { Options } from 'sequelize'


const postgresqlUrl = `postgresql://${process.env.POSTGRES_USER}:${process.env.POSTGRES_PASSWORD}@${process.env.POSTGRES_HOST}/${process.env.POSTGRES_DB}`

export const development = {
	url: postgresqlUrl,
	options: <Options>{
		minifyAliases: false,
		logging: false,
		pool: {
			max: 4
		},
		dialect: 'postgres'
	},
	seederStorage: 'sequelize',
	seederStorageTableName: 'SequelizeMetaSeeders'
}

export const test = {
	url: process.env.POSTGRESQL_URL || postgresqlUrl,
	options: <Options>{
		minifyAliases: false,
		logging: false,
		pool: {
			max: 10
		},
		dialect: 'postgres'
	}
}

export const production = {
	url: postgresqlUrl,
	options: <Options>{
		minifyAliases: false,
		logging: false,
		pool: {
			max: 20
		},
		dialect: 'postgres'
	},
	seederStorage: 'sequelize',
	seederStorageTableName: 'SequelizeMetaSeeders'
}
