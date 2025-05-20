import { Response } from 'express'
import i18next from 'i18next'
import { Parser } from 'json2csv'
import { concat, filter, map, reduce } from 'lodash'
import { OrderModel } from '../db/models/order'
import dateformat from 'dateformat'
import { DiscountCodeModel } from '../db/models/discountCode'
export const downloadOrdersAsCsv = (
	res: Response,
	fileName: string,
	orders: OrderModel[]
) => {
	const fields = [
		{
			label: i18next.t('orderNumber'),
			value: 'orderNumber',
		},
		{
			label: i18next.t('email'),
			value: 'email',
		},
		{
			label: i18next.t('userName'),
			value: 'userName',
		},
		{
			label: i18next.t('state'),
			value: 'state',
		},
		{
			label: i18next.t('price'),
			value: 'price',
		},
		{
			label: i18next.t('discount'),
			value: 'discount',
		},
		{
			label: i18next.t('ticketName'),
			value: 'ticketName',
		},
		{
			label: i18next.t('numberOfTickets'),
			value: 'numberOfTickets',
		},
		{
			label: i18next.t('createdAt'),
			value: 'createdAt',
		},
	]

	const json2csv = new Parser({ fields, withBOM: true })
	const csv = json2csv.parse(
		map(orders, (order) => {
			let adultTickets
			let userName
			if (order.tickets) {
				adultTickets = filter(
					order.tickets,
					(ticket) => ticket.isChildren === false
				)
				userName =
					adultTickets.length > 0
						? adultTickets[0].profile.name
						: order.tickets[0].profile.name
			}
			return {
				priceWithVat: order.priceWithVat.toString().replace('.', ','),
				discount: order.discount.toString().replace('.', ','),
				state: i18next.t('states', {
					context: order.state.toLocaleLowerCase(),
				}),
				orderNumber: order.orderNumber,
				numberOfTickets: order.tickets
					? order.tickets.length
					: undefined,
				email: order.tickets[0].profile.email,
				userName:
					adultTickets && userName ? userName : i18next.t('empty'),
				ticketName: order.tickets[0].ticketType.name,
				createdAt: dateformat(new Date(order.createdAt), 'd.m.yyyy'),
			}
		})
	)
	res.header('Content-Type', 'text/csv')
	res.attachment(fileName)
	return res.send(csv)
}

export const downloadDiscountCodesAsCsv = (
	res: Response,
	fileName: string,
	discountCodes: DiscountCodeModel[]
) => {
	const fields = [
		{
			label: i18next.t('discountCode'),
			value: 'code',
		},
		{
			label: i18next.t('discountAmount'),
			value: 'amount',
		},
		{
			label: i18next.t('validFrom'),
			value: 'validFrom',
		},
		{
			label: i18next.t('validTo'),
			value: 'validTo',
		},
		{
			label: i18next.t('customerEmail'),
			value: 'customerEmail',
		},
		{
			label: i18next.t('usedAt'),
			value: 'usedAt',
		},
		{
			label: i18next.t('discountCodecreatedAt'),
			value: 'createdAt',
		},
	]

	const json2csv = new Parser({ fields, withBOM: true })
	const csv = json2csv.parse(
		map(discountCodes, (discountCode) => {
			return {
				code: discountCode.code,
				amount: discountCode.amount,
				validFrom: dateformat(
					new Date(discountCode.validFrom),
					'd.m.yyyy'
				),
				validTo: dateformat(new Date(discountCode.validTo), 'd.m.yyyy'),
				usedAt: discountCode.usedAt
					? dateformat(new Date(discountCode.usedAt), 'd.m.yyyy')
					: '',
				customerEmail:
					discountCode.order && discountCode.order.tickets[0]
						? discountCode.order.tickets[0].profile.email
						: '',
				createdAt: dateformat(
					new Date(discountCode.createdAt),
					'd.m.yyyy'
				),
			}
		})
	)
	res.header('Content-Type', 'text/csv')
	res.attachment(fileName)
	return res.send(csv)
}
