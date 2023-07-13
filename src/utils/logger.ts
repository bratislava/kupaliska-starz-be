import pino from 'pino-http'
import decode from 'jwt-decode'
import { ICognitoAccessToken } from '../types/interfaces'

export const httpLogger = pino({
	// use the env var below to clear up logs in development if needed
	autoLogging:
		process.env.DISABLE_PINO_AUTO_LOGGING === 'true' ? false : true,
	// this logs request body as well - it's unlikely that we're sending any sensitive data, that happens on account side, but if found use the redact key to filter them out
	serializers: {
		req(req) {
			req.body = req.raw.body
			try {
				if (typeof req?.headers?.authorization === 'string') {
					const jwt = decode<ICognitoAccessToken>(
						req.headers.authorization.split(' ')[1]
					)
					if (jwt?.sub) req.sub = jwt.sub
				}
			} catch (err) {
				req.sub = err
			}
			return req
		},
	},
	redact: ['req.headers.authorization'],
})

export const logger = httpLogger.logger

export default logger
