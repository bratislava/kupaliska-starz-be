import * as winston from 'winston'

// Define levels
const levels = {
	error: 0,
	warn: 1,
	info: 2,
	http: 3,
	debug: 4,
}

// limit info and http logging to dev mode
const level = () => {
	const env = process.env.NODE_ENV || 'development'
	const isDevelopment = env === 'development'
	return isDevelopment ? 'debug' : 'info'
}

// format logs
const format = winston.format.json()

// set where to send logs (console is good enough because of log aggregation on loki)
const transports = [
	new winston.transports.Console(),
]

// instantiate a new Winston Logger with the settings defined above
const logger = winston.createLogger({
	level: level(),
	levels,
	format,
	transports,
	exitOnError: false // do not exit on handled exceptions
})

export default logger

// Different logger that adds webpay label to logs
export const webpayLogger = logger.child({ label: 'webpay' })
