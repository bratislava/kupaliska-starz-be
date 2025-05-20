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
import { sendOrderEmail } from '../../../utils/emailSender'
import { FE_ROUTES } from '../../../utils/constants'
import { getNextOrderNumberInYear } from '../../../utils/helpers'

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
				`${webpayConfig.clientAppUrl}${FE_ROUTES.ORDER_UNSUCCESSFUL}`
			)
		}

		if (!data.PRCODE || !data.SRCODE) {
			logger.info(
				`ERROR - ${400} - PRCODE or SRCODE not provided - ${JSON.stringify(
					data
				)} - ${req.method} - ${req.ip}`
			)
			return res.redirect(
				`${webpayConfig.clientAppUrl}${FE_ROUTES.ORDER_UNSUCCESSFUL}`
			)
		}

		if (!order) {
			logger.info(
				`ERROR - ${404} - Order not found - ${JSON.stringify(data)} - ${
					req.method
				} - ${req.ip}`
			)
			return res.redirect(
				`${webpayConfig.clientAppUrl}${FE_ROUTES.ORDER_UNSUCCESSFUL}`
			)
		}

		const paymentOrder = order.paymentOrder

		if (!paymentOrder) {
			logger.info(
				`ERROR - ${404} - Payment order not found - ${JSON.stringify(
					data
				)} - ${req.method} - ${req.ip}`
			)
			logger.error('PAYMENT - payment  order not found', req.ip)
			await order.update({ state: ORDER_STATE.FAILED })
			return res.redirect(
				`${webpayConfig.clientAppUrl}${FE_ROUTES.ORDER_UNSUCCESSFUL}`
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
			logger.info('PAYMENT - payment  verification failed', req.ip)
			await order.update({ state: ORDER_STATE.FAILED })
			return res.redirect(
				`${webpayConfig.clientAppUrl}${FE_ROUTES.ORDER_UNSUCCESSFUL}`
			)
		}

		if (!paymentResult.isSuccess) {
			logger.info(
				`ERROR - ${400} - Payment was not successful- ${JSON.stringify(
					data
				)} - ${req.method} - ${req.ip}`
			)
			logger.error('PAYMENT - was not successful', req.ip)
			if (
				// PRCODE 14 means "RESULTTEXT":"Duplicate order number" and in this case we should not update order state beacause if it is already paid we don't want to change it
				parseInt(data.PRCODE, 10) !== 14 ||
				parseInt(data.SRCODE, 10) !== 0
			) {
				await order.update({ state: ORDER_STATE.FAILED })
			}
			return res.redirect(
				`${webpayConfig.clientAppUrl}${FE_ROUTES.ORDER_UNSUCCESSFUL}`
			)
		}

		const getNextOrderNumber = await getNextOrderNumberInYear()
		await order.update({
			state: ORDER_STATE.PAID,
			orderNumberInYear: getNextOrderNumber.orderNumberInYear,
			orderPaidInYear: getNextOrderNumber.orderPaidInYear,
		})
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

		await sendOrderEmail(req, order.id)

		const queryParams = formurlencoded(
			{
				orderId: order.id,
				orderAccessToken: orderAccessToken ? orderAccessToken : null,
			},
			{ ignorenull: true }
		)

		return res.redirect(
			`${webpayConfig.clientAppUrl}${FE_ROUTES.ORDER_SUCCESSFUL}?${queryParams}`
		)
	} catch (error) {
		return next(error)
	}
}
