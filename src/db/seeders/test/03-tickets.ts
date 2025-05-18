import {
	ENTRY_FLAG,
	ENTRY_TYPE,
	TICKET_TYPE,
	USER_ROLE,
	ORDER_STATE,
} from '../../../utils/enums'
import { QueryInterface } from 'sequelize'
import { TicketModel } from '../../models/ticket'
import { UserModel } from '../../models/user'
import { createSwimmingPool } from '../../factories/swimmingPool'
import { createProfile } from '../../factories/profile'
import faker from 'faker'

export const ticketId = 'c70954c7-970d-4f1a-acf4-12b91acabe01'
export const ticketAllowedSwimmingPoolId =
	'c70954c7-970d-4f1a-acf4-12b91acabe05'
export const ticket2Id = 'c70954c7-970d-4f1a-acf4-12b91acabe02'
export const ticket2AllowedSwimmingPoolId =
	'c70954c7-970d-4f1a-acf4-12b91acabe07'
export const ticket3Id = 'c70954c7-970d-4f1a-acf4-12b91acabe03'
export const ticket3AllowedSwimmingPoolId =
	'c70954c7-970d-4f1a-acf4-12b91acabe06'

export async function up(queryInterface: QueryInterface) {
	const employee = await UserModel.create({
		email: 'example@example.sk',
		name: 'Test employee',
		hash: 'Hash',
		role: USER_ROLE.SWIMMING_POOL_EMPLOYEE,
	})

	await TicketModel.bulkCreate(
		[
			{
				id: ticketId,
				priceWithTax: 3.99,
				priceWithoutTax: 3.0723,
				priceTax: 0.9177,
				isChildren: false,
				remainingEntries: 4,
				order: {
					price: 3.99,
					orderNumber: 100,
					state: ORDER_STATE.PAID,
				},
				profile: createProfile(),
				ticketType: {
					name: 'Sezónny tiket',
					description: faker.lorem.paragraph(15),
					priceWithTax: 20,
					priceWithoutTax: 15.4,
					priceTax: 4.6,
					type: TICKET_TYPE.ENTRIES,
					entriesNumber: 10,
					nameRequired: true,
					photoRequired: true,
					childrenAllowed: false,
					validFrom: '2021-04-12',
					validTo: '2021-07-12',
					hasTicketDuration: false,
					hasEntranceConstraints: false,
					swimmingPools: [
						createSwimmingPool(),
						createSwimmingPool(ticketAllowedSwimmingPoolId),
					],
				},
			},
			{
				id: ticket2Id,
				priceWithTax: 3.99,
				priceWithoutTax: 3.0723,
				priceTax: 0.9177,
				isChildren: false,
				remainingEntries: 0,
				order: {
					price: 3.99,
					orderNumber: 101,
					state: ORDER_STATE.CREATED,
				},
				profile: createProfile(),
				ticketType: {
					name: 'Vstupovy',
					description: faker.lorem.paragraph(15),
					priceWithTax: 20,
					priceWithoutTax: 15.4,
					priceTax: 4.6,
					type: TICKET_TYPE.ENTRIES,
					nameRequired: true,
					photoRequired: true,
					childrenAllowed: false,
					validFrom: '2021-06-12',
					validTo: '2021-07-12',
					hasTicketDuration: true,
					ticketDuration: '02:15',
					hasEntranceConstraints: true,
					entranceFrom: '14:00',
					entranceTo: '15:00',
					entriesNumber: 10,
					swimmingPools: [
						createSwimmingPool(),
						createSwimmingPool(ticket2AllowedSwimmingPoolId),
					],
				},
				entries: [
					{
						type: ENTRY_TYPE.CHECKIN,
						flag: ENTRY_FLAG.MANUAL,
						timestamp: '2021-05-02 16:19:35',
						swimmingPool: createSwimmingPool(),
						employeeId: employee.id,
					},
					{
						type: ENTRY_TYPE.CHECKIN,
						flag: ENTRY_FLAG.MANUAL,
						timestamp: '2021-05-02 23:59:59',
						swimmingPool: createSwimmingPool(),
						employeeId: employee.id,
					},
					{
						type: ENTRY_TYPE.CHECKOUT,
						flag: ENTRY_FLAG.MANUAL,
						timestamp: '2021-05-03 00:05:35',
						swimmingPool: createSwimmingPool(),
						employeeId: employee.id,
					},
					{
						type: ENTRY_TYPE.CHECKIN,
						flag: ENTRY_FLAG.AUTOMATIC,
						timestamp: '2021-05-03 05:19:35',
						swimmingPool: createSwimmingPool(),
						employeeId: employee.id,
					},
					{
						type: ENTRY_TYPE.CHECKIN,
						flag: ENTRY_FLAG.MANUAL,
						timestamp: '2021-05-03 11:19:35',
						swimmingPool: createSwimmingPool(),
						employeeId: employee.id,
					},
					{
						type: ENTRY_TYPE.CHECKIN,
						flag: ENTRY_FLAG.MANUAL,
						timestamp: '2021-05-03 12:19:35',
						swimmingPool: createSwimmingPool(),
						employeeId: employee.id,
					},
					{
						type: ENTRY_TYPE.CHECKOUT,
						flag: ENTRY_FLAG.MANUAL,
						timestamp: '2021-05-03 13:19:35',
						swimmingPool: createSwimmingPool(),
						employeeId: employee.id,
					},
					{
						type: ENTRY_TYPE.CHECKIN,
						flag: ENTRY_FLAG.MANUAL,
						timestamp: '2021-05-03 15:19:35',
						swimmingPool: createSwimmingPool(),
						employeeId: employee.id,
					},
				],
			},
			{
				id: ticket3Id,
				priceWithTax: 3.99,
				priceWithoutTax: 3.0723,
				priceTax: 0.9177,
				isChildren: false,
				remainingEntries: 0,
				order: {
					price: 3.99,
					orderNumber: 102,
					state: ORDER_STATE.PAID,
				},
				profile: createProfile(),
				ticketType: {
					name: 'Vstupovy',
					description: faker.lorem.paragraph(15),
					priceWithTax: 20,
					priceWithoutTax: 15.4,
					priceTax: 4.6,
					type: TICKET_TYPE.ENTRIES,
					nameRequired: true,
					photoRequired: true,
					childrenAllowed: false,
					validFrom: '2021-02-12',
					validTo: '2021-07-12',
					hasTicketDuration: true,
					ticketDuration: '02:15',
					hasEntranceConstraints: true,
					entranceFrom: '14:00',
					entranceTo: '15:00',
					entriesNumber: 5,
					swimmingPools: [
						createSwimmingPool(),
						createSwimmingPool(ticket3AllowedSwimmingPoolId),
					],
				},
			},
		],
		{
			include: [
				{ association: 'order' },
				{ association: 'profile' },
				{
					association: 'ticketType',
					include: [{ association: 'swimmingPools' }],
				},
				{
					association: 'entries',
					include: [
						{ association: 'employee' },
						{ association: 'swimmingPool' },
					],
				},
			],
		}
	)
}

export async function down(queryInterface: QueryInterface) {
	// This is intentional
}
