import { ORDER_STATE } from '../../../utils/enums'
import { QueryInterface } from 'sequelize'
import { OrderModel } from '../../models/order'
import { createTicketType } from '../../factories/ticketType'
import { createProfile } from '../../factories/profile'
import { createTicket } from '../../factories/ticket'
import { createOrder } from '../../factories/order'

export async function up(queryInterface: QueryInterface) {
	await OrderModel.bulkCreate(
		[
			{
				orderNumber: 50,
				...createOrder(),
				tickets: [
					{
						...createTicket(),
						profile: createProfile(),
						ticketType: createTicketType(),
					},
				],
			},
			{
				orderNumber: 51,
				...createOrder(),
				tickets: [
					{
						...createTicket(),
						profile: createProfile(),
						ticketType: createTicketType(),
					},
				],
			},
			{
				orderNumber: 52,
				...createOrder(),
				tickets: [
					{
						...createTicket(),
						profile: createProfile(),
						ticketType: createTicketType(),
					},
				],
			},
			{
				price: 3.99,
				orderNumber: 49,
				state: ORDER_STATE.CREATED,
			},
		],
		{
			include: [
				{ association: 'paymentOrder' },
				{
					association: 'tickets',
					include: [
						{ association: 'profile' },
						{ association: 'ticketType' },
					],
				},
			],
		}
	)
}

export async function down(queryInterface: QueryInterface) {
	// This is intentional
}
