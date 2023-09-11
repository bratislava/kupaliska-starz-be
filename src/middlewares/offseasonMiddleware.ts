import { Request, Response, NextFunction } from 'express'
import ErrorBuilder from '../utils/ErrorBuilder'
import Turnstile, { TurnstileOptions, TurnstileResponse } from 'cf-turnstile'
import { logger } from '../utils/logger'

export default async (req: Request, _res: Response, next: NextFunction) => {
	if (process.env.OFFSEASON === 'true')
		return next(new ErrorBuilder(400, req.t('error:offseason')))
	next()
}
