import { Op } from 'sequelize'
import { models } from '../db/models'
import { ORDER_STATE, ORDER_STATE_GPWEBPAY } from '../utils/enums'
import logger from '../utils/logger'
import { getPaymentStatusWebServiceRequest } from '../services/webpayService'
import { sendOrderEmail } from '../utils/emailSender'
import { markOrderPaid } from '../utils/helpers'

process.on('message', async () => {
	logger.info('Check created unpaid orders of last 30 minutes.')
	const { Order } = models

	try {
		// TODO we should lock this, in case when user visits response endpoint at a same time as this process is running
		const orders = await Order.findAll({
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

		const skippedOrders: { orderNumber: number; reason: string }[] = []

		for (const order of orders) {
			try {
				const orderNumber = order.orderNumber
				logger.info(`Found CREATED order - id: ${orderNumber} checking against GP`)
				const parsedXmlBodyFromGP = await getPaymentStatusWebServiceRequest(orderNumber)
				if (!parsedXmlBodyFromGP) {
					const reason = 'Did not receive proper data from GP webservice for processing.'
					logger.info(`Skipping validating order.orderNumber: ${order.orderNumber}, ${reason}`)
					skippedOrders.push({ orderNumber: order.orderNumber, reason })
					continue
				}
				try {
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

					if (status === ORDER_STATE_GPWEBPAY.CAPTURED) {
						logger.info(
							`Found PAID order without proper status in order - id: ${orderNumber} changing status to PAID and sending email`
						)
						const paidNow = await markOrderPaid(order)

						// only send the email if this call actually paid the order
						if (paidNow) {
							await sendOrderEmail(undefined, order.id)
						}
					}
				} catch (error) {
					logger.info(error)
					logger.info(`Error parsing GP response: ${JSON.stringify(error)}`)
				}
			} catch (err) {
				logger.info(err)
				logger.info(`ERROR - Check created unpaid orders - ERROR: ${JSON.stringify(err)}`)
			}
		}

		if (skippedOrders.length > 0) {
			return process.send({ type: 'partial_success', skippedOrders })
		}
		return process.send({ type: 'success' })
	} catch (err) {
		logger.info(JSON.stringify(err))
		logger.info(`ERROR - Check created unpaid orders - ERROR: ${JSON.stringify(err)}`)
		return process.send({ type: 'error', err })
	}
})
