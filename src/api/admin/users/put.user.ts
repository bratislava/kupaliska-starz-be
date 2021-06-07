import Joi from 'joi'
import { NextFunction, Request, Response } from 'express'
import DB, { models } from '../../../db/models'
import { MESSAGE_TYPE, USER_ROLE, USER_ROLES } from '../../../utils/enums'
import ErrorBuilder from '../../../utils/ErrorBuilder'
import { formatUser } from '../../../utils/formatters'
import { Op, Transaction } from 'sequelize'
import { isEmpty, map } from 'lodash'
import { UserModel } from '../../../db/models/user'

export const userPutSchema = {
	name: Joi.string().required().max(255),
	isConfirmed: Joi.boolean().required(),
	email: Joi.string().email().max(255).required(),
	role: Joi.string().uppercase().valid(...USER_ROLES).required(),
	swimmingPools: Joi.array().items(
		Joi.string().guid({ version: ['uuidv4'] }).required()
	).when('role', {
		is: Joi.valid(USER_ROLE.SWIMMING_POOL_EMPLOYEE, USER_ROLE.SWIMMING_POOL_OPERATOR),
		then: Joi.required(), otherwise: Joi.forbidden()
	}),
}

export const schema = Joi.object().keys({
	body: Joi.object().keys(userPutSchema),
	query: Joi.object(),
	params: Joi.object().keys({
		userId: Joi.string().guid({ version: ['uuidv4'] }).required()
	})
})

export const workflow = async (req: Request, res: Response, next: NextFunction) => {
	const {
		User,
		SwimmingPool,
		SwimmingPoolUser
	} = models

	let transaction: Transaction
	try {
		const { body, params } = req
		const authUser = req.user as UserModel

		const userExists = await User.unscoped().findOne({
			where: {
				email: { [Op.eq]: body.email }
			},
			paranoid: false
		})

		if (userExists) {
			if (userExists.id !== params.userId) {
				throw new ErrorBuilder(409, req.t('error:userEmailAlreadyExists'))
			}
		}

		const user = await User.unscoped().findByPk(params.userId)
		if (!user) {
			throw new ErrorBuilder(404, req.t('error:userNotFound'))
		}

		if (authUser.canPerformAction(user.role) === false || authUser.canPerformAction(body.role) === false) {
			throw new ErrorBuilder(403, 'Forbidden action')
		}

		if (!isEmpty(body.swimmingPools)) {
			const swimmingPools = await SwimmingPool.findAll({
				where: {
					id: {
						[Op.in]: body.swimmingPools
					}
				}
			})
			if (swimmingPools.length !== body.swimmingPools.length) {
				throw new ErrorBuilder(400, req.t('error:incorrectSwimmingPools'))
			}
		}

		transaction = await DB.transaction()

		await user.update(body, { transaction })

		await SwimmingPoolUser.destroy({
			where: {
				userId: {
					[Op.eq]: user.id
				}
			},
			transaction
		})

		if (!isEmpty(body.swimmingPools)) {

			await SwimmingPoolUser.bulkCreate(map(body.swimmingPools, (poolId) => ({
				swimmingPoolId: poolId,
				userId: user.id
			})), { transaction })
		}

		await transaction.commit()
		transaction = null
		await user.reload({ include: { association: 'swimmingPools' } })

		return res.json({
			data: {
				id: user.id,
				user: formatUser(user)
			},
			messages: [{
				type: MESSAGE_TYPE.SUCCESS,
				message: req.t('success:admin.users.updated')
			}]
		})
	} catch (err) {
		if (transaction) {
			await transaction.rollback()
		}
		return next(err)
	}
}
