import { Request, Response, NextFunction } from 'express'
import ErrorBuilder from '../utils/ErrorBuilder'
import Turnstile, { TurnstileOptions, TurnstileResponse } from 'cf-turnstile'
import { logger } from '../utils/logger'

// inspired from https://github.com/bratislava/nest-city-account/commit/08bdea6c13b7258e9ac1a2cfa33ec9bd66024ec2
let turnstile:
	| ((
			token: string,
			options?: TurnstileOptions
	  ) => Promise<TurnstileResponse>)
	| undefined

if (!process.env.TURNSTILE_SECRET_KEY) {
	logger.warn(
		'TURNSTILE_SECRET not set! Using dummy token, captcha will always pass.'
	)
	turnstile = Turnstile('1x0000000000000000000000000000000AA')
} else {
	turnstile = Turnstile(process.env.TURNSTILE_SECRET_KEY)
	logger.info('Successfully initialized Turnstile')
}

export default async (req: Request, _res: Response, next: NextFunction) => {
	try {
		const result = await turnstile(req.body.token)
		if (!result?.success) {
			throw new ErrorBuilder(400, req.t('error:invalidRecaptcha'))
		}
		return next()
	} catch (error) {
		return next(error)
	}
}
