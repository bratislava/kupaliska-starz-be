import { Response } from 'express'
import i18next from 'i18next';
import { Parser } from 'json2csv';
import { concat, filter, map, reduce } from 'lodash';
import { OrderModel } from '../db/models/order';
import dateformat from 'dateformat'
export const downloadOrdersAsCsv = (res: Response, fileName: string, orders: OrderModel[]) => {
	const fields = [
		{
			label: i18next.t('orderNumber'),
			value: 'orderNumber'
		},
		{
			label: i18next.t('email'),
			value: 'email'
		},
		{
			label: i18next.t('userName'),
			value: 'userName'
		},
		{
			label: i18next.t('state'),
			value: 'state'
		},
		{
			label: i18next.t('price'),
			value: 'price'
		},
		{
			label: i18next.t('discount'),
			value: 'discount'
		},
		{
			label: i18next.t('ticketName'),
			value: 'ticketName'
		},
		{
			label: i18next.t('createdAt'),
			value: 'createdAt'
		}
	];

	const json2csv = new Parser({ fields });
	const csv = json2csv.parse(
		concat(
			map(orders, (order) => {

				let adultTickets
				let userName
				if (order.tickets) {
					adultTickets = filter(order.tickets, (ticket) => (ticket.isChildren === false))
					userName = adultTickets.length > 0 ? adultTickets[0].profile.name : order.tickets[0].profile.name
				}
				return {
					price: order.price,
					discount: order.discount,
					state: i18next.t('states', { context: order.state.toLocaleLowerCase() }),
					orderNumber: order.orderNumber,
					email: order.tickets[0].profile.email,
					userName: adultTickets && userName ? userName : i18next.t('empty'),
					ticketName: order.tickets[0].ticketType.name,
					createdAt: dateformat(new Date(order.createdAt), 'd.m.yyyy')
				}
			}),
			[
				reduce(orders, (summary, order) => {
					summary.price = Math.round((summary.price + order.price) * 100) / 100
					summary.discount = Math.round((summary.discount + order.discount) * 100) / 100
					return summary
				}, { price: 0, discount: 0 } as any)
			]
		)
	);
	res.header('Content-Type', 'text/csv');
	res.attachment(fileName);
	return res.send(csv);
}
