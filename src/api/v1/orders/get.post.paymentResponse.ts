import { Request, Response, NextFunction } from 'express'
import Joi from 'joi'
import config from 'config'
import formurlencoded from 'form-urlencoded'
import { isEqual } from 'lodash'
import { models } from '../../../db/models'
import { registerPaymentResult } from '../../../services/webpayService'
import { logger } from '../../../utils/logger'
import { Op } from 'sequelize'
import { createJwt } from '../../../utils/authorization'
import { IPassportConfig, IGPWebpayConfig } from '../../../types/interfaces'
import { ORDER_STATE } from '../../../utils/enums'
import { sendOrderEmail } from '../../../utils/emailSender'
import { FE_ROUTES } from '../../../utils/constants'
import { markOrderPaid } from '../../../utils/helpers'
import { OrderModel } from '../../../db/models/order'

const passwordConfig: IPassportConfig = config.get('passport')
const webpayConfig: IGPWebpayConfig = config.get('gpWebpayService')

export const schema = Joi.object({
	body: Joi.object(),
	query: Joi.object(),
	params: Joi.object(),
})

export const workflow = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { body, query, method } = req
		const { Order, PaymentResponse } = models
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
			return res.redirect(`${webpayConfig.clientAppUrl}${FE_ROUTES.ORDER_UNSUCCESSFUL}`)
		}

		if (!data.PRCODE || !data.SRCODE) {
			logger.info(
				`ERROR - ${400} - PRCODE or SRCODE not provided - ${JSON.stringify(
					data
				)} - ${req.method} - ${req.ip}`
			)
			return res.redirect(`${webpayConfig.clientAppUrl}${FE_ROUTES.ORDER_UNSUCCESSFUL}`)
		}

		if (!order) {
			logger.info(
				`ERROR - ${404} - Order not found - ${JSON.stringify(data)} - ${req.method} - ${req.ip}`
			)
			return res.redirect(`${webpayConfig.clientAppUrl}${FE_ROUTES.ORDER_UNSUCCESSFUL}`)
		}

		const paymentOrder = order.paymentOrder

		if (!paymentOrder) {
			logger.info(
				`ERROR - ${404} - Payment order not found - ${JSON.stringify(
					data
				)} - ${req.method} - ${req.ip}`
			)
			logger.error('PAYMENT - payment  order not found', req.ip)
			await failOrderUnlessPaid(order)
			return res.redirect(`${webpayConfig.clientAppUrl}${FE_ROUTES.ORDER_UNSUCCESSFUL}`)
		}

		// TODO fix race condition when there could be another payment that can pass this
		// between the time this findAll executes and registerPaymentResult finishes execution
		const existingPaymentResponses = await PaymentResponse.findAll({
			where: {
				paymentOrderId: {
					[Op.eq]: paymentOrder.id,
				},
			},
		})

		const alreadyProcessed = existingPaymentResponses.some((paymentResponse) =>
			isEqual(paymentResponse.data, data)
		)

		if (alreadyProcessed) {
			logger.info(
				`INFO - Duplicate payment response received for already processed order - ${JSON.stringify(
					data
				)} - ${req.method} - ${req.ip}`
			)
			// there can be a lot more responses successful and unsuccessful in all kind of order,
			// in the and what matters is, if after all of them, order is paid or not.
			if (order.state === ORDER_STATE.PAID) {
				return res.redirect(await buildSuccessRedirectUrl(order.id))
			}
			return res.redirect(`${webpayConfig.clientAppUrl}${FE_ROUTES.ORDER_UNSUCCESSFUL}`)
		}

		const paymentResult = await registerPaymentResult(data, paymentOrder.id, req)

		if (!paymentResult.isVerified) {
			logger.info(
				`ERROR - ${400} - Payment verification failed - ${JSON.stringify(
					data
				)} - ${req.method} - ${req.ip}`
			)
			logger.info('PAYMENT - payment  verification failed', req.ip)
			await failOrderUnlessPaid(order)
			return res.redirect(`${webpayConfig.clientAppUrl}${FE_ROUTES.ORDER_UNSUCCESSFUL}`)
		}

		if (!paymentResult.isSuccess) {
			await handleGlobalPaymentsErrorResponse(data, req, order)
			return res.redirect(`${webpayConfig.clientAppUrl}${FE_ROUTES.ORDER_UNSUCCESSFUL}`)
		}

		const paidNow = await markOrderPaid(order)

		if (paidNow) {
			await sendOrderEmail(req, order.id)
		}

		return res.redirect(await buildSuccessRedirectUrl(order.id))
	} catch (error) {
		return next(error)
	}
}

// Atomic conditional update so a late/duplicate failure response cannot overwrite an order that was
// already paid
const failOrderUnlessPaid = async (order: OrderModel) => {
	await models.Order.update(
		{ state: ORDER_STATE.FAILED },
		{
			where: {
				id: order.id,
				state: {
					[Op.ne]: ORDER_STATE.PAID,
				},
			},
		}
	)
}

const buildSuccessRedirectUrl = async (orderId: string) => {
	// Generate JWT for getting order`s info
	const orderAccessToken = await createJwt(
		{
			uid: orderId,
		},
		{
			audience: passwordConfig.jwt.orderResponse.audience,
			expiresIn: passwordConfig.jwt.orderResponse.exp,
		}
	)

	const queryParams = formurlencoded(
		{
			orderId: orderId,
			orderAccessToken: orderAccessToken ? orderAccessToken : null,
		},
		{ ignorenull: true }
	)

	return `${webpayConfig.clientAppUrl}${FE_ROUTES.ORDER_SUCCESSFUL}?${queryParams}`
}

const handleGlobalPaymentsErrorResponse = async (data: any, req: Request, order: OrderModel) => {
	// https://portal.gpwebpay.com/portal/tools/GP_webpay_Seznam_navratovych_kodu_CZ.pdf?locale=cs_CZ

	// PRCODE 14 means "RESULTTEXT":"Duplicate order number" and in this case we should not update order state beacause if it is already paid we don't want to change it
	if (parseInt(data.PRCODE, 10) === 14 || parseInt(data.SRCODE, 10) === 0) {
		return
	} else {
		if (parseInt(data.PRCODE, 10) === 20 || parseInt(data.SRCODE, 10) === 22) {
			logger.info(`WARNING - ${400} - ${JSON.stringify(data)} - ${req.method} - ${req.ip}`)
		} else if (
			// PRCODE 28 SRCODE 3000 means "RESULTTEXT":"Declined in 3D. Cardholder not authenticated in 3D."
			parseInt(data.PRCODE, 10) === 28 ||
			parseInt(data.SRCODE, 10) === 3000
		) {
			logger.info(`WARNING - ${400} - ${JSON.stringify(data)} - ${req.method} - ${req.ip}`)
		} else if (
			// PRCODE 28 SRCODE 3007 means "RESULTTEXT":"Declined in 3D. Acquirer technical problem. Contact the merchant."
			parseInt(data.PRCODE, 10) === 28 ||
			parseInt(data.SRCODE, 10) === 3007
		) {
			logger.info(`WARNING - ${400} - ${JSON.stringify(data)} - ${req.method} - ${req.ip}`)
		} else if (parseInt(data.PRCODE, 10) === 30 || parseInt(data.SRCODE, 10) === 300) {
			// Soft decline – issuer requires SCA (Strong Customer Authentication)
			logger.info(`WARNING - ${400} - ${JSON.stringify(data)} - ${req.method} - ${req.ip}`)
		} else if (parseInt(data.PRCODE, 10) === 30 || parseInt(data.SRCODE, 10) === 1002) {
			// Vydavatel, nebo finanční asociace zamítla autorizaci BEZ udání důvodu
			logger.info(`WARNING - ${400} - ${JSON.stringify(data)} - ${req.method} - ${req.ip}`)
		} else if (parseInt(data.PRCODE, 10) === 30 || parseInt(data.SRCODE, 10) === 9100) {
			logger.info(`WARNING - ${400} - ${JSON.stringify(data)} - ${req.method} - ${req.ip}`)
		} else if (parseInt(data.PRCODE, 10) === 30 || parseInt(data.SRCODE, 10) === 9500) {
			logger.info(`WARNING - ${400} - ${JSON.stringify(data)} - ${req.method} - ${req.ip}`)
		} else if (parseInt(data.PRCODE, 10) === 30 || parseInt(data.SRCODE, 10) === 9900) {
			logger.info(`WARNING - ${400} - ${JSON.stringify(data)} - ${req.method} - ${req.ip}`)
		} else if (
			// PRCODE 35 means "RESULTTEXT":"Vyprsal cas pre zadanie cisla karty. Objednavku nie je mozne dokoncit."
			parseInt(data.PRCODE, 10) === 35 ||
			parseInt(data.SRCODE, 10) === 0
		) {
			logger.info(
				`WARNING - ${400} - Session expired when submitting card details- ${JSON.stringify(
					data
				)} - ${req.method} - ${req.ip}`
			)
		} else if (
			// PRCODE 50 means "RESULTTEXT":"The cardholder canceled the payment"
			parseInt(data.PRCODE, 10) === 50 ||
			parseInt(data.SRCODE, 10) === 0
		) {
			logger.info(
				`WARNING - ${400} - The cardholder canceled the payment- ${JSON.stringify(
					data
				)} - ${req.method} - ${req.ip}`
			)
		} else {
			logger.info(
				`ERROR - ${400} - Payment was not successful- ${JSON.stringify(
					data
				)} - ${req.method} - ${req.ip}`
			)
			logger.error('PAYMENT - was not successful', req.ip)
		}
		await failOrderUnlessPaid(order)
	}
}
