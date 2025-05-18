import Joi from 'joi'
import { NextFunction, Request, Response } from 'express'
import { models } from '../../../db/models'
import { MESSAGE_TYPE, ORDER_STATE } from '../../../utils/enums'
import ErrorBuilder from '../../../utils/ErrorBuilder'
import { sendOrderEmail } from '../../../utils/emailSender'

export const schema = Joi.object().keys({
	body: Joi.object(),
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
	try {
		const { params } = req

		const order = await Order.findByPk(params.orderId, {
			include: {
				association: 'tickets',
				order: [['isChildren', 'asc']],
				separate: true,
				include: [
					{ association: 'profile' },
					{ association: 'ticketType' },
				],
			},
		})

		if (!order) {
			throw new ErrorBuilder(404, req.t('error:orderNotFound'))
		}

		if (order.state !== ORDER_STATE.PAID) {
			throw new ErrorBuilder(404, req.t('error:orderMustBeInPaidState'))
		}

		await sendOrderEmail(req, order.id)

		return res.json({
			data: {},
			messages: [
				{
					type: MESSAGE_TYPE.SUCCESS,
					message: req.t('success:emailSent'),
				},
			],
		})
	} catch (err) {
		return next(err)
	}
}
