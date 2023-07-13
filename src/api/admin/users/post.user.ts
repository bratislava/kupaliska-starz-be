import { formatUser } from './../../../utils/formatters'
import { USER_ROLE } from './../../../utils/enums'
import Joi from 'joi'
import { NextFunction, Request, Response } from 'express'
import { Op, Transaction } from 'sequelize'
import DB, { models } from '../../../db/models'
import { createJwt } from '../../../utils/authorization'

import { USER_ROLES, MESSAGE_TYPE } from '../../../utils/enums'

import ErrorBuilder from '../../../utils/ErrorBuilder'
import { isEmpty, map } from 'lodash'
import { UserModel } from '../../../db/models/user'
import { sendEmail } from '../../../services/mailerService'
import config from 'config'
import {
	IAppConfig,
	IMailgunserviceConfig,
	IPassportConfig,
} from '../../../types/interfaces'

export const userAddSchema = {
	name: Joi.string().max(255).required(),
	isConfirmed: Joi.boolean().required(),
	email: Joi.string().email().max(255).required(),
	role: Joi.string()
		.uppercase()
		.valid(...USER_ROLES)
		.required(),
	swimmingPools: Joi.array()
		.items(
			Joi.string()
				.guid({ version: ['uuidv4'] })
				.required()
		)
		.when('role', {
			is: Joi.valid(
				USER_ROLE.SWIMMING_POOL_EMPLOYEE,
				USER_ROLE.SWIMMING_POOL_OPERATOR
			),
			then: Joi.required(),
			otherwise: Joi.forbidden(),
		}),
}

export const schema = Joi.object().keys({
	body: Joi.object().keys(userAddSchema),
	query: Joi.object(),
	params: Joi.object(),
})

const passwordConfig: IPassportConfig = config.get('passport')
const appConfig: IAppConfig = config.get('app')
const mailgunConfig: IMailgunserviceConfig = config.get('mailgunService')
const setPasswordTemplate = mailgunConfig.templates.setPassword

const { User, SwimmingPool, SwimmingPoolUser } = models

export const workflow = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	let transaction: Transaction
	try {
		const { body } = req
		const authUser = req.user as UserModel

		if (authUser.canPerformAction(body.role) === false) {
			throw new ErrorBuilder(403, 'Forbidden action')
		}

		const userExists = await User.unscoped().findOne({
			where: {
				email: { [Op.eq]: body.email },
			},
			paranoid: false,
		})
		if (userExists) {
			if (userExists.email === body.email) {
				throw new ErrorBuilder(
					409,
					req.t('error:userEmailAlreadyExists')
				)
			} else {
				throw new ErrorBuilder(409, req.t('error:userAlreadyExists'))
			}
		}

		if (!isEmpty(body.swimmingPools)) {
			const swimmingPools = await SwimmingPool.findAll({
				where: {
					id: {
						[Op.in]: body.swimmingPools,
					},
				},
			})
			if (swimmingPools.length !== body.swimmingPools.length) {
				throw new ErrorBuilder(
					400,
					req.t('error:incorrectSwimmingPools')
				)
			}
		}

		transaction = await DB.transaction()

		const user = await User.create(
			{
				...body,
				hash: '',
			},
			{ transaction }
		)

		if (!isEmpty(body.swimmingPools)) {
			await SwimmingPoolUser.bulkCreate(
				map(body.swimmingPools, (poolId) => ({
					swimmingPoolId: poolId,
					userId: user.id,
				})),
				{ transaction }
			)
		}

		const accessToken = await createJwt(
			{
				uid: user.id,
			},
			{
				audience: passwordConfig.jwt.resetPassword.audience,
				expiresIn: passwordConfig.jwt.setPassword.exp,
			}
		)

		// send email to reset pass
		await sendEmail(
			req,
			body.email,
			req.t('email:setPasswordSubject'),
			setPasswordTemplate,
			{
				resetLink: `${appConfig.feResetPasswordUrl}?token=${accessToken}`,
			}
		)

		await transaction.commit()
		transaction = null
		await user.reload({ include: { association: 'swimmingPools' } })

		return res.json({
			data: {
				id: user.id,
				user: formatUser(user),
			},
			messages: [
				{
					type: MESSAGE_TYPE.SUCCESS,
					message: req.t('success:admin.users.created'),
				},
			],
		})
	} catch (err) {
		if (transaction) {
			await transaction.rollback()
		}
		return next(err)
	}
}
