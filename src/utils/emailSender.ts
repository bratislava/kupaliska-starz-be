import { concat, map } from 'lodash'
import { TicketModel } from '../db/models/ticket'
import { sendEmail } from '../services/mailerService'
import { IAppConfig, IMailgunserviceConfig } from '../types/interfaces'
import { generateQrCodeBuffer } from './qrCodeGenerator'
import {
	getChildrenTicketName,
	getTicketNameTranslation,
} from './translationsHelpers'
import config from 'config'
import { OrderModel } from '../db/models/order'
import { Request } from 'express'
import { generatePdf, generatePdfVatDocument } from './pdfGenerator'
import i18next, { InitOptions } from 'i18next'
import { textColorsMap } from './enums'
import i18nextMiddleware from 'i18next-http-middleware'
import i18nextBackend from 'i18next-node-fs-backend'
import { CustomFile } from 'mailgun.js'
import { models } from '../db/models'

const i18NextConfig: InitOptions = config.get('i18next')
const appConfig: IAppConfig = config.get('app')
const mailgunConfig: IMailgunserviceConfig = config.get('mailgunService')
const orderTemplate = mailgunConfig.templates.order

const { Order, DiscountCode } = models

export const sendOrderEmail = async (
	req: Request | undefined,
	orderId: string
) => {
	const order = await Order.findByPk(orderId, {
		include: [
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

	const discountCode = await DiscountCode.findByPk(order.discountCodeId)
	const discountInPercent = discountCode?.amount || 0
	const parentTicket = order.tickets[0]
	if (!req) {
		await i18next
			.use(i18nextMiddleware.LanguageDetector)
			.use(i18nextBackend)
			.init({
				...i18NextConfig,
			}) // it has to be copy otherwise is readonly
	}
	const params = [
		'email:orderSubject',
		{
			ticketName: getTicketNameTranslation(
				parentTicket.ticketType,
				1,
				'a'
			),
		},
	]
	const zerofilled =
		order.orderPaidInYear + `00000000${order.orderNumberInYear}`.slice(-8)

	for (const ticket of order.tickets) {
		ticket.qrCode = await generateQrCodeBuffer(ticket.id, {
			width: 264,
		})
	}

	await sendEmail(
		req,
		parentTicket.profile.email,
		req?.t
			? req.t('email:orderSubject', {
					ticketName: getTicketNameTranslation(
						parentTicket.ticketType,
						1,
						'a'
					),
			  })
			: i18next.t('email:orderSubject', {
					ticketName: getTicketNameTranslation(
						parentTicket.ticketType,
						1,
						'a'
					),
			  }),
		orderTemplate,
		getOrderEmailData(parentTicket, order),
		order.tickets.length < 10
			? await getOrderEmailInlineAttachments(order.tickets)
			: undefined,
		await getOrderEmailAttachments(
			order.tickets,
			order.priceWithVat,
			discountInPercent,
			zerofilled
		)
	)
}

const getOrderEmailInlineAttachments = async (
	tickets: TicketModel[]
): Promise<CustomFile[]> => {
	return await Promise.all(
		map(tickets, async (ticket, index) => {
			return {
				data: ticket.qrCode,
				filename: `qr-code-${index + 1}.png`,
			}
		})
	)
}

const getOrderEmailAttachments = async (
	tickets: TicketModel[],
	orderPriceWithVat: number,
	orderDiscountPercentage: number,
	orderVatDocumentNumber: string
): Promise<CustomFile[]> => {
	return concat(
		await Promise.all(
			tickets.length <= 5
				? map(tickets, async (ticket) => {
						const ticketProfileName = ticket.profile.name
							? `${ticket.profile.name}_`
							: ''
						ticket.qrCode = await generateQrCodeBuffer(ticket.id)
						return {
							data: Buffer.from(
								await generatePdf([ticket]),
								'base64'
							),

							// when filename contains "/" it will be deleted with everything before it therefore we need to replace it with something else
							filename: `${ticketProfileName
								.toString()
								.replace('/', ', ')}${ticket.ticketType.name
								.toString()
								.replace('/', ', ')}_${ticket.id.substr(
								ticket.id.length - 8
							)}.pdf`,
						}
				  })
				: []
		),
		tickets.length > 1
			? [
					{
						data: Buffer.from(await generatePdf(tickets), 'base64'),
						filename: `${i18next.t('allTickets')}.pdf`,
					},
			  ]
			: [],
		{
			data: Buffer.from(
				await generatePdfVatDocument(
					tickets,
					orderPriceWithVat,
					orderDiscountPercentage,
					orderVatDocumentNumber
				),
				'base64'
			),
			filename: `danovy-doklad.pdf`,
		}
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
			priceWithVat: items.adults.priceWithVat,
		},
	]
	if (items.children.amount > 0) {
		summaryItems.push({
			name: items.children.name, // ticket name for children is always same
			amount: items.children.amount,
			priceWithVat: items.children.priceWithVat,
		})
	}
	return {
		name: parentTicket.profile.name,
		type: parentTicket.ticketType.type,
		disposable: parentTicket.ticketType.isDisposable,
		hasManyTickets: order.tickets.length > 10,
		tickets:
			order.tickets.length < 10
				? map(order.tickets, (ticket, index) => {
						const appleWalletUrl = `${appConfig.host}/api/v1/orders/appleWallet/${ticket.id}`
						const googleWalletUrl = `${appConfig.host}/api/v1/orders/googlePay/${ticket.id}`
						return {
							heading: ticket.isChildren
								? getChildrenTicketName()
								: ticket.ticketType.name,
							subheading: !ticket.ticketType.isDisposable
								? ticket.profile.name +
								  `, ${i18next.t('year', {
										count: ticket.profile.age,
								  })}`
								: null,
							qrCode: `cid:qr-code-${index + 1}.png`,
							backgroundColor:
								textColorsMap[ticket.getCategory()].background,
							textColor: textColorsMap[ticket.getCategory()].text,
							appleWalletUrl: appleWalletUrl,
							googleWalletUrl: googleWalletUrl,
							hasWalletTicket:
								appleWalletUrl || googleWalletUrl
									? true
									: false,
						}
				  })
				: [],
		summary: {
			items: summaryItems, // sorted by adult/children condition
			totalPrice: order.priceWithVat.toFixed(2), // could be omitted
		},
	}
}
