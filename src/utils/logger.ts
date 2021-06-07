import * as winston from 'winston'
import * as path from 'path'
import WinstonDailyRotateFile from 'winston-daily-rotate-file'
import config from 'config'

import { IAppConfig } from '../types/interfaces'

const appConfig: IAppConfig = config.get('app')
const errorFileName = path.join(appConfig.logsPath, 'error-%DATE%.log')
const infoFileName = path.join(appConfig.logsPath, 'info-%DATE%.log')
const webpayFileName = path.join(appConfig.logsPath, 'webpay-%DATE%.log')

// instantiate a new Winston Logger with the settings defined above
export default winston.createLogger({
	format: winston.format.combine(
		winston.format.timestamp({
			format: 'YYYY-MM-DD HH:mm:ss'
		}),
		winston.format.printf((info) => `${info.timestamp} ${info.level}: ${info.message}`)
	),
	transports: [
		new WinstonDailyRotateFile({
			filename: errorFileName,
			datePattern: 'YYYY-MM-DD',
			zippedArchive: false,
			level: 'error',
			maxSize: '500m',
			maxFiles: '120d'
		}),
		new WinstonDailyRotateFile({
			filename: infoFileName,
			datePattern: 'YYYY-MM-DD',
			zippedArchive: false,
			level: 'info',
			maxSize: '500m',
			maxFiles: '120d'
		})
	],
	exitOnError: false // do not exit on handled exceptions
})


export const webpayLogger = winston.createLogger({
	format: winston.format.combine(
		winston.format.label({ label: 'webpay' }),
		winston.format.timestamp({
			format: 'YYYY-MM-DD HH:mm:ss'
		}),
		winston.format.json()
	),
	transports: [
		new WinstonDailyRotateFile({
			filename: webpayFileName,
			datePattern: 'YYYY-MM-DD',
			zippedArchive: false,
			level: 'info',
			eol: '\n\n'
		})
	],
	exitOnError: false
})
