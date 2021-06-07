import * as Tracing from '@sentry/tracing'
import * as Sentry from '@sentry/node'
import config from 'config'

import { ISentryConfig } from '../types/interfaces'
import { ENV } from '../utils/enums'

const sentryConfig: ISentryConfig = config.get('sentry')

export const initSentry = (app: any) => {
	if (process.env.NODE_ENV !== ENV.test && process.env.SENTRY_DSN) {
		Sentry.init({
			dsn: sentryConfig.dsn,
			environment: sentryConfig.env,
			debug: sentryConfig.debug,
			integrations: [
				// enable HTTP calls tracing
				new Sentry.Integrations.Http({ tracing: true }),
				// enable Express.js middleware tracing
				new Tracing.Integrations.Express({ app }),
			  ],
			  // Set tracesSampleRate to 1.0 to capture 100%
			  // of transactions for performance monitoring.
			  // We recommend adjusting this value in production
			  tracesSampleRate: Number(sentryConfig.tracesSampleRate),
			  sampleRate: 1
		})
	}
}

export const captureMessage = (message: string, ipAddress: string, contextName?: string, context?: any) => {
	Sentry.withScope(function (scope) {
		scope.setUser({
			ip_address: ipAddress
		});
		if (contextName && context) {
			scope.setContext(contextName, context)
		}
		Sentry.captureMessage(message, Sentry.Severity.Critical);
	});
}

export const captureError = (err: any, ipAddress: string, contextName?: string, context?: any) => {
	Sentry.withScope(function (scope) {
		scope.setUser({
			ip_address: ipAddress
		});
		if (contextName && context) {
			scope.setContext(contextName, context)
		}
		Sentry.captureException(err)
	});
}


export default Sentry
