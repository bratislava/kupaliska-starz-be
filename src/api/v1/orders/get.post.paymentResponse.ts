import { Request, Response, NextFunction } from 'express'
import Joi from 'joi'
import config from 'config'
import formurlencoded from 'form-urlencoded'
import { models } from '../../../db/models'
import { registerPaymentResult } from '../../../services/webpayService'
import { logger } from '../../../utils/logger'
import { Op } from 'sequelize'
import { createJwt } from '../../../utils/authorization'
import { IPassportConfig, IGPWebpayConfig } from '../../../types/interfaces'
import { ORDER_STATE } from '../../../utils/enums'
import { captureMessage } from '../../../services/sentryService'
import { sendOrderEmail } from '../../../utils/emailSender'

const passwordConfig: IPassportConfig = config.get('passport')
const webpayConfig: IGPWebpayConfig = config.get('gpWebpayService')

export const schema = Joi.object({
	body: Joi.object(),
	query: Joi.object(),
	params: Joi.object(),
})

export const workflow = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	try {
		const { body, query, method } = req
		const { Order } = models
		const data = method === 'POST' ? body : query

		logger.info(
			`INFO - Payment response received - ${JSON.stringify(
				data
			)} - ${JSON.stringify(req.method)} - ${req.ip}`
		)

		const order = await Order.findOne({
			where: {
				orderNumber: {
					[Op.eq]: data.ORDERNUMBER,
				},
			},
			include: [
				{
					association: 'paymentOrder',
				},
				{
					association: 'tickets',
					order: [['isChildren', 'asc']],
					separate: true,
					include: [
						{
							association: 'profile',
						},
						{
							association: 'ticketType',
						},
					],
				},
			],
		})

		if (!data.DIGEST || !data.DIGEST1) {
			logger.info(
				`ERROR - ${400} - DIGEST OR DIGEST1 not provided - ${JSON.stringify(
					data
				)} - ${req.method} - ${req.ip}`
			)
			return res.redirect(
				`${webpayConfig.clientAppUrl}/order-result?success=false`
			)
		}

		if (!data.PRCODE || !data.SRCODE) {
			logger.info(
				`ERROR - ${400} - PRCODE or SRCODE not provided - ${JSON.stringify(
					data
				)} - ${req.method} - ${req.ip}`
			)
			return res.redirect(
				`${webpayConfig.clientAppUrl}/order-result?success=false`
			)
		}

		if (!order) {
			logger.info(
				`ERROR - ${404} - Order not found - ${JSON.stringify(data)} - ${
					req.method
				} - ${req.ip}`
			)
			return res.redirect(
				`${webpayConfig.clientAppUrl}/order-result?success=false`
			)
		}

		const paymentOrder = order.paymentOrder

		if (!paymentOrder) {
			logger.info(
				`ERROR - ${404} - Payment order not found - ${JSON.stringify(
					data
				)} - ${req.method} - ${req.ip}`
			)
			captureMessage('PAYMENT - payment  order not found', req.ip)
			await order.update({ state: ORDER_STATE.FAILED })
			return res.redirect(
				`${webpayConfig.clientAppUrl}/order-result?success=false`
			)
		}

		const paymentResult = await registerPaymentResult(
			data,
			paymentOrder.id,
			req
		)

		if (!paymentResult.isVerified) {
			logger.info(
				`ERROR - ${400} - Payment verification failed - ${JSON.stringify(
					data
				)} - ${req.method} - ${req.ip}`
			)
			captureMessage('PAYMENT - payment  verification failed', req.ip)
			await order.update({ state: ORDER_STATE.FAILED })
			return res.redirect(
				`${webpayConfig.clientAppUrl}/order-result?success=false`
			)
		}

		if (!paymentResult.isSuccess) {
			logger.info(
				`ERROR - ${400} - Payment was not successful- ${JSON.stringify(
					data
				)} - ${req.method} - ${req.ip}`
			)
			captureMessage('PAYMENT - was not successful', req.ip)
			await order.update({ state: ORDER_STATE.FAILED })
			return res.redirect(
				`${webpayConfig.clientAppUrl}/order-result?success=false`
			)
		}

		await order.update({ state: ORDER_STATE.PAID })

		// Generate JWT for getting order`s info
		const orderAccessToken = await createJwt(
			{
				uid: order.id,
			},
			{
				audience: passwordConfig.jwt.orderResponse.audience,
				expiresIn: passwordConfig.jwt.orderResponse.exp,
			}
		)

		await sendOrderEmail(req, order)

		const queryParams = formurlencoded(
			{
				success: paymentResult.isSuccess,
				orderId: order.id,
				orderAccessToken: orderAccessToken ? orderAccessToken : null,
			},
			{ ignorenull: true }
		)

		return res.redirect(
			`${webpayConfig.clientAppUrl}/order-result?${queryParams}`
		)
	} catch (error) {
		return next(error)
	}
}
