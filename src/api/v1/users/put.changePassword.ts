import config from 'config'
import { UserModel } from '../../../db/models/user';
import Joi from 'joi'
import { NextFunction, Request, Response } from 'express'
import DB, { models } from '../../../db/models'
import { MESSAGE_TYPE } from '../../../utils/enums'
import ErrorBuilder from '../../../utils/ErrorBuilder'
import { comparePassword, createJwt, hashPassword } from '../../../utils/authorization';
import { IPassportConfig } from '../../../types/interfaces'
import { Transaction } from 'sequelize';
import passwordComplexity, { ComplexityOptions } from 'joi-password-complexity'

const passwordConfig: IPassportConfig = config.get('passport')
const complexityOptions: ComplexityOptions  = config.get('passwordComplexityOptions')

export const userPutSchema = {
	oldPassword: Joi.string().required().pattern(new RegExp('^[a-zA-Z0-9]{3,30}$')),
	password: passwordComplexity(complexityOptions).required(),
	passwordConfirmation: Joi.string().valid(Joi.ref('password')).required(),
}

export const schema = Joi.object().keys({
	body: Joi.object().keys(userPutSchema),
	query: Joi.object(),
	params: Joi.object()
})

export const workflow = async (req: Request, res: Response, next: NextFunction) => {
	const {
		User,
	} = models

	let transaction: Transaction
	try {
		const { body } = req
		const { id } = req.user as UserModel

		const user = await User.findByPk(id)
		if (!user) {
			throw new ErrorBuilder(404, req.t('error:userNotFound'))
		}

		const passwordVerified = await comparePassword(body.oldPassword, user.hash)

		if (!passwordVerified) {
			throw new ErrorBuilder(400, req.t('error:incorrectPassword'), 'incorrectPassword')
		}

		const hashedPassword = await hashPassword(body.password)

		transaction = await DB.transaction()

		const newIssuedTokens = user.issuedTokens + 1
		await user.update(
			{
				hash: hashedPassword,
				tokenValidFromNumber: newIssuedTokens, // invalidate previous tokens
				issuedTokens: newIssuedTokens
			}, { transaction })

		const accessToken = await createJwt({
			uid: user.id,
			s: newIssuedTokens,
		}, {
			audience: passwordConfig.jwt.user.audience,
			expiresIn: passwordConfig.jwt.user.exp
		})

		await transaction.commit()
		return res.json({
			data: {
				accessToken,
				id: user.id
			},
			messages: [{
				type: MESSAGE_TYPE.SUCCESS,
				message: req.t('success:admin.users.passwordChanged')
			}]
		})
	} catch (err) {
		if (transaction) {
			await transaction.rollback()
		}
		return next(err)
	}
}
