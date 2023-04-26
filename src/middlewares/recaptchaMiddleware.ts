import { Request, Response, NextFunction } from 'express'
import ErrorBuilder from '../utils/ErrorBuilder'
import Turnstile from 'cf-turnstile'

export default async (req: Request, _res: Response, next: NextFunction) => {
	// inspired from https://github.com/bratislava/nest-city-account/commit/08bdea6c13b7258e9ac1a2cfa33ec9bd66024ec2
	let turnstile

	if (!process.env.RECAPTCHA_CLIENT_SECRET) {
		console.warn(
			'TURNSTILE_SECRET not set! Using dummy token, captcha will always pass.'
		)
		turnstile = Turnstile('1x0000000000000000000000000000000AA')
	} else {
		turnstile = Turnstile(process.env.RECAPTCHA_CLIENT_SECRET)
		console.log('Successfully initialized Turnstile')
	}
	try {
		const result = await turnstile(req.body.token)
		if (!result?.success) {
			throw new ErrorBuilder(400, req.t('error:invalidRecaptcha'))
		}
		return next()
	} catch (error) {
		console.log('error')
		console.error(error)

		return next(error)
	}
}
