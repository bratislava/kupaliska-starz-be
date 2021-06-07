import { UserModel } from '../../../db/models/user';
import Joi from 'joi'
import { NextFunction, Request, Response } from 'express'
import DB, { models } from '../../../db/models'
import { MESSAGE_TYPE } from '../../../utils/enums'
import ErrorBuilder from '../../../utils/ErrorBuilder'
import { hashPassword } from '../../../utils/authorization';
import { Transaction } from 'sequelize';
import passwordComplexity, { ComplexityOptions } from 'joi-password-complexity'
import config from 'config'

const complexityOptions: ComplexityOptions  = config.get('passwordComplexityOptions')

export const userResetPasswordSchema = {
	password: passwordComplexity(complexityOptions).required(),
	passwordConfirmation: Joi.string().valid(Joi.ref('password')).required(),
}

export const schema = Joi.object().keys({
	body: Joi.object().keys(userResetPasswordSchema),
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

		const hashedPassword = await hashPassword(body.password)

		transaction = await DB.transaction()

		await user.update(
			{
				hash: hashedPassword,
			}, { transaction })

		await transaction.commit()
		return res.json({
			data: {},
			messages: [{
				type: MESSAGE_TYPE.SUCCESS,
				message: req.t('success:admin.users.passwordHasBeenReset')
			}]
		})
	} catch (err) {
		if (transaction) {
			await transaction.rollback()
		}
		return next(err)
	}
}
