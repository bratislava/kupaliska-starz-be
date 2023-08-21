import { Op } from 'sequelize'
import Joi from 'joi'
import xml2js from 'xml2js'
import { models } from '../db/models'
import { ORDER_STATE, ORDER_STATE_GPWEBPAY } from '../utils/enums'
import logger from '../utils/logger'
import {
	getPaymentStatusWebServiceRequest,
	verifyDataGetPaymentStatusWebserviceResponse,
} from '../services/webpayService'
import { sendOrderEmail } from '../utils/emailSender'

const gpWebserviceSchema = Joi.object({
	'soapenv:Envelope': Joi.object().keys({
		$: Joi.object().keys({
			'xmlns:soapenv': Joi.string(),
		}),
		'soapenv:Body': Joi.array()
			.required()
			.min(1)
			.items({
				'ns4:getPaymentStatusResponse': Joi.array()
					.min(1)
					.required()
					.items({
						$: Joi.object().keys({
							'xmlns:ns4': Joi.string(),
							xmlns: Joi.string(),
							'xmlns:ns5': Joi.string(),
							'xmlns:ns3': Joi.string(),
							'xmlns:ns2': Joi.string(),
						}),
						'ns4:paymentStatusResponse': Joi.array()
							.min(1)
							.required()
							.items({
								'ns3:messageId': Joi.array()
									.required()
									.items(Joi.string()),
								'ns3:state': Joi.array()
									.required()
									.items(Joi.string()),
								'ns3:status': Joi.array()
									.min(1)
									.required()
									.items(Joi.string()),
								'ns3:subStatus': Joi.array()
									.required()
									.items(Joi.string()),
								'ns3:signature': Joi.array()
									.required()
									.items(Joi.string()),
							}),
					}),
			}),
	}),
})

process.on('message', async () => {
	logger.info('Check created unpaid orders of last 30 minutes.')
	const { Order } = models

	try {
		const orders = await Order.findAll({
			where: {
				state: ORDER_STATE.CREATED,
				createdAt: {
					[Op.gte]: new Date(Date.now() - 30 * 60 * 1000),
					[Op.lte]: new Date(Date.now() - 5 * 60 * 1000),
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

		for (const order of orders) {
			try {
				const orderNumber = order.orderNumber
				logger.info(
					`Found CREATED order - id: ${orderNumber} checking against GP`
				)
				const responseFromGP = await getPaymentStatusWebServiceRequest(
					orderNumber
				)
				const data = await responseFromGP.text()
				logger.info(`Data from GP received ${data}`)
				const parser = new xml2js.Parser()
				let parsedBody = null
				try {
					parsedBody = await parser.parseStringPromise(data)

					const { error: validateSchemaError, value } =
						gpWebserviceSchema.validate(parsedBody)
					if (validateSchemaError) {
						logger.info(
							`Error validating GP response: ${validateSchemaError}`
						)
					} else {
						const realData =
							value['soapenv:Envelope']['soapenv:Body'][0][
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
							await order.update({ state: ORDER_STATE.PAID })
							await sendOrderEmail(undefined, order)
						}
					}
				} catch (error) {
					logger.info(error)
					logger.info(`Error parsing GP response: ${error}`)
				}
			} catch (err) {
				logger.info(err)
				logger.info(
					`ERROR - Check created unpaid orders - ERROR: ${JSON.stringify(
						err
					)}`
				)
			}
		}

		return process.send({ type: 'success' })
	} catch (err) {
		logger.info(JSON.stringify(err))
		logger.info(
			`ERROR - Check created unpaid orders - ERROR: ${JSON.stringify(
				err
			)}`
		)
		return process.send({ type: 'error', err })
	}
})
