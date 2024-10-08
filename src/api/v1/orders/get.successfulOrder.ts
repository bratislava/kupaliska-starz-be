import { formatTicket } from './../../../utils/formatters'
import { generateQrCodeDataUrl } from '../../../utils/qrCodeGenerator'
import Joi from 'joi'
import { Op } from 'sequelize'
import { NextFunction, Request, Response } from 'express'
import { models } from '../../../db/models'
import ErrorBuilder from '../../../utils/ErrorBuilder'
import { clone, map } from 'lodash'
import { generatePdf } from '../../../utils/pdfGenerator'

const { Order } = models

export const schema = Joi.object().keys({
	body: Joi.object(),
	query: Joi.object(),
	params: Joi.object().keys({
		orderId: Joi.string()
			.guid({ version: ['uuidv4'] })
			.required(),
	}),
})

export const workflow = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	try {
		const { params } = req
		const authInfo = req.authInfo as { orderId: string }

		if (params.orderId !== authInfo.orderId) {
			throw new ErrorBuilder(404, req.t('error:orderNotFound'))
		}

		const order = await Order.findOne({
			attributes: ['id'],
			where: {
				id: { [Op.eq]: authInfo.orderId },
			},
			include: [
				{
					association: 'tickets',
					attributes: ['id', 'isChildren'],
					include: [
						{
							association: 'ticketType',
							attributes: [
								'id',
								'validTo',
								'name',
								'childrenAgeToWithAdult',
								'isSeniorIsDisabled',
							],
						},
						{
							association: 'profile',
							attributes: ['name', 'age'],
						},
					],
				},
			],
		})

		if (!order) {
			throw new ErrorBuilder(404, req.t('error:orderNotFound'))
		}

		const pdfTickets = clone(order.tickets)
		for (const ticket of pdfTickets) {
			ticket.qrCode = await generateQrCodeDataUrl(ticket.id)
		}

		const pdfBase64 = await generatePdf(pdfTickets)

		const responseTickets = clone(order.tickets)
		for (const ticket of responseTickets) {
			ticket.qrCode = await generateQrCodeDataUrl(ticket.id, {
				width: 400,
				margin: 0,
			})
		}

		return res.json({
			tickets: map(responseTickets, (ticket) => formatTicket(ticket)),
			pdf: `data:application/pdf;base64,${pdfBase64}`,
		})
	} catch (err) {
		return next(err)
	}
}
