import config from 'config'
import Joi from 'joi'
import { Op } from 'sequelize'
import { Request, Response, NextFunction } from 'express'
import DB, { models } from '../../../db/models'
import { createJwt, hashPassword, verifyPasswordWithFallback } from '../../../utils/authorization'
import ErrorBuilder from '../../../utils/ErrorBuilder'
import { IPassportConfig } from '../../../types/interfaces'
import { map } from 'lodash'
import { USER_ROLE } from '../../../utils/enums'

const passwordConfig: IPassportConfig = config.get('passport')

export const schema = Joi.object().keys({
	body: Joi.object().keys({
		email: Joi.string().email().required(),
		// name of this field is directly related to redact mechanism
		// in ErrorBuilder and in logger
		password: Joi.string().required(),
	}),
	query: Joi.object(),
	params: Joi.object(),
})

export const workflow = async (req: Request, res: Response, next: NextFunction) => {
	const transaction = await DB.transaction()

	try {
		const { body } = req
		const { User, SwimmingPool } = models

		const user = await User.findOne({
			where: {
				email: {
					[Op.eq]: body.email,
				},
				isConfirmed: {
					[Op.eq]: true,
				},
			},
			include: { association: 'swimmingPools' },
		})

		if (!user) {
			throw new ErrorBuilder(401, req.t('error:incorrectUsernameOrPassword'))
		}

		const { isVerified, isVerifiedViaFallback } = await verifyPasswordWithFallback(
			body.password,
			user.hash
		)

		if (!isVerified) {
			throw new ErrorBuilder(401, req.t('error:incorrectUsernameOrPassword'))
		}

		const newIssuedTokens = user.issuedTokens + 1
		await user.update(
			{
				lastLoginAt: new Date(),
				issuedTokens: newIssuedTokens,
				// lazily migrate previous hashes to current hash on successful login
				...(isVerifiedViaFallback && {
					hash: await hashPassword(body.password),
				}),
			},
			{ transaction }
		)

		const accessToken = await createJwt(
			{
				uid: user.id,
				s: newIssuedTokens,
			},
			{
				audience: passwordConfig.jwt.user.audience,
				expiresIn: passwordConfig.jwt.user.exp,
			}
		)

		if (user.role === USER_ROLE.SUPER_ADMIN || user.role === USER_ROLE.OPERATOR) {
			user.swimmingPools = await SwimmingPool.findAll({
				attributes: ['id', 'name'],
			})
		}

		await transaction.commit()
		return res.json({
			data: {
				accessToken,
				profile: {
					id: user.id,
					email: user.email,
					role: user.role,
					name: user.name,
					lastLoginAt: user.lastLoginAt,
					swimmingPools: map(user.swimmingPools, (pool) => ({
						id: pool.id,
						name: pool.name,
					})),
				},
			},
			messages: [],
		})
	} catch (err) {
		await transaction.rollback()
		return next(err)
	}
}
