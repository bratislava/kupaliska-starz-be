import { Op } from 'sequelize'
import { models } from '../db/models'
import { ORDER_STATE, ORDER_STATE_GPWEBPAY } from '../utils/enums'
import logger from '../utils/logger'
import { getPaymentStatusWebServiceRequest } from '../services/webpayService'
import { sendOrderEmail } from '../utils/emailSender'
import { markOrderPaid } from '../utils/helpers'
import { OrderModel } from '../db/models/order'

process.on('message', async () => {
	logger.info('Check created unpaid orders of last 30 minutes.')
	const { Order } = models

	let orders: OrderModel[] = []
	try {
		orders = await Order.findAll({
			where: {
				state: ORDER_STATE.CREATED,
				createdAt: {
					[Op.gte]: new Date(Date.now() - 30 * 60 * 1000),
					// https://github.com/bratislava/kupaliska-starz-be/issues/113
					// if user pays in the middle of this algorithm,
					// he will get two mails, this will mostly erase this problem,
					// but not solve it completly and it should happen very rarely.
					[Op.lte]: new Date(Date.now() - 1 * 60 * 1000),
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
			order: [['createdAt', 'DESC']],
		})
	} catch (err) {
		logger.error(`${JSON.stringify(err)}`)
		return process.send({ type: 'error', err })
	}

	const skippedOrders: { orderNumber: number; reason: string }[] = []

	for (const order of orders) {
		try {
			const orderNumber = order.orderNumber
			logger.info(`Found CREATED order - id: ${orderNumber} checking against GP`)
			const parsedXmlBodyFromGP = await getPaymentStatusWebServiceRequest(orderNumber)
			// received known PR code from GP webservice error response, for now nothing more to do
			if (!parsedXmlBodyFromGP) {
				continue
			}
			const realData =
				parsedXmlBodyFromGP['soapenv:Envelope']['soapenv:Body'][0][
					'ns4:getPaymentStatusResponse'
				][0]['ns4:paymentStatusResponse'][0]
			const messageId = realData['ns3:messageId'][0]
			const status = realData['ns3:status'][0]
			const state = realData['ns3:state'][0]
			const subStatus = realData['ns3:subStatus'][0]
			const signature = realData['ns3:signature'][0]
			// should be used to verify if needed
			// await verifyDataGetPaymentStatusWebserviceResponse(
			// 	[messageId, state, status, subStatus],
			// 	signature
			// )
			if (status !== ORDER_STATE_GPWEBPAY.CAPTURED) {
				logger.debug(
					`Order ${orderNumber} not having "${ORDER_STATE_GPWEBPAY.CAPTURED}" status, status is: ${status}`
				)
				continue
			}

			logger.info(
				`Found PAID order without proper status in order - id: ${orderNumber} changing status to PAID and sending email`
			)
			const paidNow = await markOrderPaid(order)

			if (!paidNow) {
				logger.info(`Order ${orderNumber} already marked as paid or is missing in DB.`)
				continue
			}

			// only send the email if this call actually paid the order
			await sendOrderEmail(undefined, order.id)
		} catch (error) {
			skippedOrders.push({
				orderNumber: order.orderNumber,
				reason: `Error when processing GP response: ${error instanceof Error ? JSON.stringify(error.message) : JSON.stringify(error)}`,
			})
			continue
		}
	}

	if (skippedOrders.length > 0) {
		return process.send({ type: 'partial_success', skippedOrders })
	}
	return process.send({ type: 'success' })
})
