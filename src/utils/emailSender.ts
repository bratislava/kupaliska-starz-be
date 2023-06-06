import { concat, map } from 'lodash'
import { Attachment } from 'mailgun-js'
import { TicketModel } from '../db/models/ticket'
import { createAttachment, sendEmail } from '../services/mailerService'
import { IAppConfig, IMailgunserviceConfig } from '../types/interfaces'
import { generateQrCodeBuffer } from './qrCodeGenerator'
import {
	getChildrenTicketName,
	getTicketNameTranslation,
} from './translationsHelpers'
import config from 'config'
import { OrderModel } from '../db/models/order'
import { Request } from 'express'
import { generatePdf } from './pdfGenerator'
import i18next from 'i18next'
import { textColorsMap } from './enums'

const appConfig: IAppConfig = config.get('app')
const mailgunConfig: IMailgunserviceConfig = config.get('mailgunService')
const orderTemplate = mailgunConfig.templates.order

export const sendOrderEmail = async (req: Request, order: OrderModel) => {
	const parentTicket = order.tickets[0]

	await sendEmail(
		req,
		parentTicket.profile.email,
		req.t('email:orderSubject', {
			ticketName: getTicketNameTranslation(
				parentTicket.ticketType,
				1,
				'a'
			),
		}),
		orderTemplate,
		getOrderEmailData(parentTicket, order),
		await getOrderEmailInlineAttachments(order.tickets),
		await getOrderEmailAttachments(order.tickets)
	)
}

const getOrderEmailInlineAttachments = async (
	tickets: TicketModel[]
): Promise<Attachment[]> => {
	return await Promise.all(
		map(tickets, async (ticket, index) => {
			ticket.qrCode = await generateQrCodeBuffer(ticket.id, {
				width: 264,
				margin: 0,
			})
			return createAttachment({
				data: ticket.qrCode,
				filename: `qr-code-${index + 1}.png`,
			})
		})
	)
}

const getOrderEmailAttachments = async (
	tickets: TicketModel[]
): Promise<Attachment[]> => {
	return concat(
		await Promise.all(
			map(tickets, async (ticket) => {
				const ticketProfileName = ticket.profile.name
					? `${ticket.profile.name}_`
					: ''
				ticket.qrCode = await generateQrCodeBuffer(ticket.id)
				return createAttachment({
					data: Buffer.from(await generatePdf([ticket]), 'base64'),
					filename: `${ticketProfileName}${
						ticket.ticketType.name
					}_${ticket.id.substr(ticket.id.length - 8)}.pdf`,
				})
			})
		),
		tickets.length > 1
			? [
					createAttachment({
						data: Buffer.from(await generatePdf(tickets), 'base64'),
						filename: `${i18next.t('allTickets')}.pdf`,
					}),
			  ]
			: []
	)
}

const getOrderEmailData = (parentTicket: TicketModel, order: OrderModel) => {
	const items = order.getItems()
	const emailItems = [items.adults]
	if (items.children.amount > 0) {
		emailItems.push(items.children)
	}
	if (order.discount > 0) {
		emailItems.push(items.discount)
	}

	const summaryItems = [
		{
			name: items.adults.name, // ticket name
			amount: items.adults.amount,
			price: items.adults.price,
		},
	]
	if (items.children.amount > 0) {
		summaryItems.push({
			name: items.children.name, // ticket name for children is always same
			amount: items.children.amount,
			price: items.children.price,
		})
	}
	return {
		name: parentTicket.profile.name,
		type: parentTicket.ticketType.type,
		tickets: map(order.tickets, (ticket, index) => {
			const appleWalletUrl = `${appConfig.host}/api/v1/orders/appleWallet/${ticket.id}`
			const googleWalletUrl = `${appConfig.host}/api/v1/orders/googlePay/${ticket.id}`
			return {
				heading: ticket.isChildren
					? getChildrenTicketName()
					: ticket.ticketType.name,
				subheading: ticket.ticketType.isDisposable
					? ticket.profile.name +
					  `, ${i18next.t('year', {
							count: ticket.profile.age,
					  })}`
					: null,
				qrCode: `cid:qr-code-${index + 1}.png`,
				backgroundColor: textColorsMap[ticket.getCategory()].background,
				textColor: textColorsMap[ticket.getCategory()].text,
				appleWalletUrl: appleWalletUrl,
				googleWalletUrl: googleWalletUrl,
				hasWalletTicket:
					appleWalletUrl || googleWalletUrl ? true : false,
			}
		}),
		summary: {
			items: summaryItems, // sorted by adult/children condition
			totalPrice: order.price.toFixed(2), // could be omitted
		},
	}
}
