import { VerifiedCallback } from 'passport-jwt'
import { Op } from 'sequelize'
import passport from 'passport'
import { Request, Response, NextFunction } from 'express'

import { models } from '../db/models'
import {
	IJwtPayload,
	IJwtQrCodePayload,
	IJwtResetPasswordPayload,
} from '../types/interfaces'
import ErrorBuilder from '../utils/ErrorBuilder'

export const checkTokenFirstAuthentication = (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	passport.authenticate(['jwt-forgotten-password'], (_err, user) => {
		if (user) {
			req.user = user
			return next()
		}
		return next(new ErrorBuilder(403, req.t('error:invalidToken')))
	})(req, res, next)
}

export const optionalAuthenticationMiddleware = (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	passport.authenticate(['jwt-api'], (_err, user) => {
		if (user) {
			req.user = user
		}
		return next()
	})(req, res, next)
}

export const validateTicketMiddleware =
	(strategy: string) => (req: Request, res: Response, next: NextFunction) => {
		passport.authenticate(strategy, (err, user, info) => {
			if (err) {
				return next(err)
			}
			if (!user) {
				throw new ErrorBuilder(404, req.t('error:ticketNotFound'))
			}

			req.logIn(user, {}, function (logInErr) {
				if (logInErr) {
					return next(logInErr)
				}
				req.authInfo = info
				return next()
			})
		})(req, res, next)
	}

export const jwtAdminVerify = async (
	payload: IJwtPayload,
	done: VerifiedCallback
) => {
	try {
		const { User } = models
		const user = await User.findOne({
			attributes: [
				'id',
				'email',
				'name',
				'role',
				'lastLoginAt',
				'isConfirmed',
				'createdAt',
				'updatedAt',
			],
			where: {
				id: {
					[Op.eq]: payload.uid,
				},
				[Op.not]: {
					hash: {
						[Op.eq]: '',
					},
				},
				tokenValidFromNumber: {
					[Op.lte]: payload.s,
				},
				issuedTokens: {
					[Op.gte]: payload.s,
				},
				isConfirmed: {
					[Op.eq]: true,
				},
			},
		})

		if (!user) {
			throw new ErrorBuilder(401, 'Unauthorized')
		}

		return done(null, user)
	} catch (e) {
		return done(e)
	}
}

export const jwtQrCodeVerify = async (
	req: Request,
	payload: IJwtQrCodePayload,
	done: VerifiedCallback
) => {
	try {
		return done(null, req.user, { ticketId: payload.tid })
	} catch (e) {
		return done(e)
	}
}

export const jwtOrderResponseVerify = async (
	req: Request,
	payload: IJwtPayload,
	done: VerifiedCallback
) => {
	try {
		return done(null, req.user || {}, { orderId: payload.uid })
	} catch (e) {
		return done(e)
	}
}

export const jwtResetPasswordVerify = async (
	payload: IJwtResetPasswordPayload,
	done: VerifiedCallback
) => {
	try {
		const { User } = models
		const user = await User.findOne({
			attributes: [
				'id',
				'email',
				'name',
				'role',
				'lastLoginAt',
				'isConfirmed',
				'createdAt',
				'updatedAt',
			],
			where: {
				id: {
					[Op.eq]: payload.uid,
				},
				isConfirmed: {
					[Op.eq]: true,
				},
			},
		})

		if (!user) {
			throw new ErrorBuilder(401, 'Unauthorized')
		}

		return done(null, user)
	} catch (e) {
		return done(e)
	}
}

export const jwtCognitoUserVerify = async (
	req: Request,
	payload: IJwtPayload,
	done: VerifiedCallback
) => {
	try {
		console.log('jwtCognitoUserVerify')
		return done(null)
	} catch (e) {
		return done(e)
	}
}
