import { USER_ROLE } from './../../../utils/enums';
import { Op, QueryInterface } from 'sequelize'
import { ENTRY_FLAG, ENTRY_TYPE, TICKET_TYPE } from '../../../utils/enums'
import { concat, map, reduce } from 'lodash';
import { createOrder } from '../../factories/order';
import { createChildrenTicket, createTicket } from '../../factories/ticket';
import { createProfile } from '../../factories/profile';
import { SwimmingPoolModel } from '../../models/swimmingPool';
import faker from 'faker';
import { models } from '../../models';
import { createDiscountCode } from '../../factories/discountCode';
import { v4 as uuidv4 } from 'uuid';

export async function up(queryInterface: QueryInterface) {

	const { TicketType, SwimmingPool, User, Order, DiscountCode } = models
	try {
		const numberOfPaidOrders = 500
		const seasonalTicketType = await TicketType.findOne({
			where: {
				childrenAllowed: {
					[Op.is]: true
				},
				type: {
					[Op.eq]: TICKET_TYPE.SEASONAL
				}
			}
		})

		const entriesTicketType = await TicketType.findOne({
			where: {
				childrenAllowed: {
					[Op.is]: false
				},
				entriesNumber: {
					[Op.gte]: 5,
				},
				type: {
					[Op.eq]: TICKET_TYPE.ENTRIES
				}
			}
		})

		const swimmingPoolsIds = reduce(
			await SwimmingPool.findAll({
				attributes: ['id']
			}), (ids: any, swimmingPool: SwimmingPoolModel) => {
				ids.push(swimmingPool.id)
				return ids
			}, []
		)

		const employee = await User.findOne({
			where: {
				role: {
					[Op.eq]: USER_ROLE.SWIMMING_POOL_EMPLOYEE
				}
			}
		})

		const discountCode = await DiscountCode.create({
			...createDiscountCode(),
			amount: 20
		})

		const zipCodes = map([...Array(40).keys()], () => (faker.address.zipCode()))

		for (let i = 0; i <= 20; i++) { // will create 20K orders

			await Order.bulkCreate(

				map([...Array(numberOfPaidOrders).keys()], () => {

					const numberOfChildren = faker.random.number(5)
					const numberOfEntries = faker.random.number(100) + 50

					const ticketId = uuidv4()
					const addDiscount = faker.random.boolean()
					const price = (seasonalTicketType.price + (numberOfChildren * seasonalTicketType.childrenPrice)) * (addDiscount ? ((100 - discountCode.amount) / 100) : 1)

					return {
						...createOrder(),
						price: price,
						discount: addDiscount ? (seasonalTicketType.price + (numberOfChildren * seasonalTicketType.childrenPrice)) * ((discountCode.amount) / 100) : 0,
						discountCodeId: addDiscount ? discountCode.id : null,
						tickets: concat([{
							...createTicket(ticketId),
							price: seasonalTicketType.price,
							remainingEntries: null,
							profile: {
								...createProfile(),
								zip: faker.random.number(100) > 40 ? faker.random.arrayElement(zipCodes) : null,
								age: faker.random.number(100) > 40 ? faker.random.number(80) + 17 : null 
							},
							parentTicketId: null,
							ticketTypeId: seasonalTicketType.id,
							entries: map([...Array(numberOfEntries).keys()], () => {
								const swimmingPoolId = faker.random.arrayElement(swimmingPoolsIds)
								const entryType = faker.random.arrayElement([ENTRY_TYPE.CHECKIN, ENTRY_TYPE.CHECKOUT])
								return {
									timestamp: faker.date.between('2021-06-13 11:01:05', '2021-09-11 11:01:05'),
									employeeId: employee.id,
									type: entryType,
									flag: ENTRY_FLAG.MANUAL,
									swimmingPoolId: swimmingPoolId
								}
							})
						}],
							map([...Array(numberOfChildren).keys()], () => ({
								...createChildrenTicket(),
								price: seasonalTicketType.childrenPrice,
								remainingEntries: null,
								profile: {
									...createProfile(),
									zip: faker.random.number(100) > 40 ? faker.random.arrayElement(zipCodes) : null,
									age: faker.random.number(100) > 40 ? faker.random.number(20) + 3 : null 
								},
								parentTicketId: ticketId,
								ticketTypeId: seasonalTicketType.id,
								entries: map([...Array(numberOfEntries).keys()], () => {
									const swimmingPoolId = faker.random.arrayElement(swimmingPoolsIds)
									const entryType = faker.random.arrayElement([ENTRY_TYPE.CHECKIN, ENTRY_TYPE.CHECKOUT])
									return {
										timestamp: faker.date.between('2021-06-13 11:01:05', '2021-09-11 11:01:05'),
										employeeId: employee.id,
										type: entryType,
										flag: ENTRY_FLAG.MANUAL,
										swimmingPoolId: swimmingPoolId
									}
								})
							})))
					}
				}), {
				include: [
					{
						association: 'paymentOrder',
						include: [
							{ association: 'paymentResponse' },
						]
					},
					{
						association: 'tickets',
						include: [
							{ association: 'profile' },
							{ association: 'ticketType' },
							{ association: 'entries' },
						]
					},
				]
			})

			await Order.bulkCreate(

				map([...Array(numberOfPaidOrders).keys()], () => {

					const remainingEntries = faker.random.number(10)
					const numberOfTickets = faker.random.number(3) + 1
					const numberOfEntries = faker.random.number(100) + 50

					const addDiscount = faker.random.boolean()
					const price = (seasonalTicketType.price) * (addDiscount ? ((100 - discountCode.amount) / 100) : 1)

					return {
						...createOrder(),
						price: price,
						discount: addDiscount ? (seasonalTicketType.price) * ((discountCode.amount) / 100) : 0,
						discountCodeId: addDiscount ? discountCode.id : null,
						tickets: map([...Array(numberOfTickets).keys()], () => ({
							...createTicket(),
							price: entriesTicketType.price,
							remainingEntries: remainingEntries,
							profile: {
								...createProfile(),
								zip: faker.random.number(100) > 40 ? faker.random.arrayElement(zipCodes) : null,
								age: faker.random.number(100) > 40 ? faker.random.number(80) + 17 : null 
							},
							parentTicketId: null,
							ticketTypeId: entriesTicketType.id,
							entries: map([...Array(numberOfEntries).keys()], () => {
								const swimmingPoolId = faker.random.arrayElement(swimmingPoolsIds)
								const entryType = faker.random.arrayElement([ENTRY_TYPE.CHECKIN, ENTRY_TYPE.CHECKOUT])
								return {
									timestamp: faker.date.between('2021-06-13 11:01:05', '2021-09-11 11:01:05'),
									employeeId: employee.id,
									type: entryType,
									flag: ENTRY_FLAG.MANUAL,
									swimmingPoolId: swimmingPoolId
								}
							})
						}))
					}
				}), {
				include: [
					{
						association: 'paymentOrder',
						include: [
							{ association: 'paymentResponse' },
						]
					},
					{
						association: 'tickets',
						include: [
							{ association: 'profile' },
							{ association: 'ticketType' },
							{ association: 'entries' },
						]
					},
				]
			})
		}
	} catch (err) {
		console.log(err)
		throw err
	}
}

export async function down(queryInterface: QueryInterface) {
	// This is intentional
}
