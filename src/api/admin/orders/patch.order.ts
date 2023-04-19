import Joi from 'joi'
import { NextFunction, Request, Response } from 'express'
import DB, { models } from '../../../db/models'
import { MESSAGE_TYPE, ORDER_STATES } from '../../../utils/enums'
import ErrorBuilder from '../../../utils/ErrorBuilder'
import { Transaction } from 'sequelize'

export const schema = Joi.object().keys({
	body: Joi.object().keys({
		email: Joi.string().max(255).email(),
		state: Joi.string().valid(...ORDER_STATES),
	}),
	query: Joi.object(),
	params: Joi.object().keys({
		orderId: Joi.string()
			.guid({ version: ['uuidv4'] })
			.required(),
	}),
})

const { Order } = models

export const workflow = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	let transaction: Transaction
	try {
		const { body, params } = req

		const order = await Order.findByPk(params.orderId, {
			include: {
				association: 'tickets',
				include: [{ association: 'profile' }],
			},
		})

		if (!order) {
			throw new ErrorBuilder(404, req.t('error:orderNotFound'))
		}

		transaction = await DB.transaction()
		const { email, ...data } = body

		await order.update(data, { transaction })

		if (email) {
			for (const ticket of order.tickets) {
				await ticket.profile.update({ email: email }, { transaction })
			}
		}

		await transaction.commit()
		await order.reload({
			include: {
				association: 'tickets',
				include: [{ association: 'profile' }],
			},
		})

		transaction = null

		return res.json({
			data: {
				id: order.id,
				order: {
					id: order.id,
					email: order.tickets[0].profile.email,
					state: order.state,
				},
			},
			messages: [
				{
					type: MESSAGE_TYPE.SUCCESS,
					message: req.t('success:admin.order.updated'),
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
