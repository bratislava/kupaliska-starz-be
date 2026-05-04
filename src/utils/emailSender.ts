import { concat, map } from 'lodash'
import { TicketModel } from '../db/models/ticket'
import { sendEmail } from '../services/mailerService'
import { IAppConfig, IMailgunserviceConfig } from '../types/interfaces'
import { generateQrCodeBuffer } from './qrCodeGenerator'
import { getChildrenTicketName } from './translationsHelpers'
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
import { DiscountCodeModel } from '../db/models/discountCode'
import ErrorBuilder from './ErrorBuilder'

const i18NextConfig: InitOptions = config.get('i18next')
const appConfig: IAppConfig = config.get('app')
const mailgunConfig: IMailgunserviceConfig = config.get('mailgunService')
const orderTemplate = mailgunConfig.templates.order

const { Order } = models

export type TicketWithDiscountPercent = TicketModel & {
	discountPercent: number
}

const getDiscountPercentForTicket = (
	ticket: TicketModel,
	sortedDiscountCodesModels: DiscountCodeModel[]
): number => {
	if (!sortedDiscountCodesModels?.length) {
		return 0
	}
	const code = sortedDiscountCodesModels.find((discountCodeModel) =>
		discountCodeModel.ticketTypes?.some(
			(ticketType) => ticketType.id === ticket.ticketTypeId
		)
	)
	return code ? code.amount : 0
}

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
			{
				association: 'discountCodes',
				include: [
					{
						association: 'ticketTypes',
					},
				],
				order: [['amount', 'DESC']],
			},
		],
	})
	if (!order) {
		throw new ErrorBuilder(404, i18next.t('error:orderNotFound'))
	}
	// TODO check logic
	// this will not work for multiple ticketTypes and multiple discounts
	// example:what if i first make order with one adult than add childrens then add one more adult and then remove first adult will the first ticket be an adult?
	if (!req) {
		await i18next
			.use(i18nextMiddleware.LanguageDetector)
			.use(i18nextBackend)
			.init({
				...i18NextConfig,
			}) // it has to be copy otherwise is readonly
	}
	const zerofilled =
		order.orderPaidInYear + `00000000${order.orderNumberInYear}`.slice(-8)

	for (const ticket of order.tickets) {
		ticket.qrCode = await generateQrCodeBuffer(ticket.id, {
			width: 264,
		})
	}

	const mappedTickets = order.tickets.map((ticket) =>
		Object.assign(ticket, {
			discountPercent: getDiscountPercentForTicket(
				ticket,
				// earlier we sorted discount codes by amount in descending order
				// so code below will pick the highest discount code for given ticket type
				order.discountCodes
			),
		})
	)
	await sendEmail(
		// TODO move email to order model, move standing tickets email to order model as well, remove email from ticket model
		order.tickets[0].profile.email,
		i18next.t('email:orderSubject'),
		orderTemplate,
		// TODO refactor in getOrderEmailData we are using order.getItems where adults and children are grouped and counted by ticketType
		// and then we are using mappedTickets to generate pdfs and qr codes
		getOrderEmailData(order),
		order.tickets.length < 10
			? await getOrderEmailInlineAttachments(order.tickets)
			: undefined,
		await getOrderEmailAttachments(
			mappedTickets,
			order.priceWithVat,
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
	tickets: TicketWithDiscountPercent[],
	orderPriceWithVat: number,
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
					orderVatDocumentNumber
				),
				'base64'
			),
			filename: `danovy-doklad.pdf`,
		}
	)
}

const getOrderEmailData = (order: OrderModel) => {
	return {
		// TODO now we have multiple ticketTypes in single email add some generic text to not use isDisposable property
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
	}
}
