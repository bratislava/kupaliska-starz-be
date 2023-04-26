import { createProfile } from '../db/factories/profile'
import { createChildrenTicket, createTicket } from '../db/factories/ticket'
import { createOrder } from '../db/factories/order'
import { createDiscountCode } from '../db/factories/discountCode'
import 'colors'
import { Op } from 'sequelize'
import faker from 'faker'
import { v4 as uuidv4 } from 'uuid'
import sequelize, { models } from '../db/models'
import { ENTRY_FLAG, ENTRY_TYPE, TICKET_TYPE, USER_ROLE } from '../utils/enums'
import { concat, map, reduce } from 'lodash'
import { SwimmingPoolModel } from '../db/models/swimmingPool'

async function generateData() {
	const { TicketType, SwimmingPool, User, Order, DiscountCode } = models
	const numberOfOrdersInBulk = 300

	const eventsFrom = '2021-05-01 00:00:00'
	const eventsTo = '2021-08-01 00:00:00'

	const seasonalTicketType = await TicketType.findOne({
		where: {
			childrenAllowed: {
				[Op.is]: true,
			},
			type: {
				[Op.eq]: TICKET_TYPE.SEASONAL,
			},
		},
	})

	const entriesTicketType = await TicketType.findOne({
		where: {
			childrenAllowed: {
				[Op.is]: false,
			},
			entriesNumber: {
				[Op.gte]: 5,
			},
			type: {
				[Op.eq]: TICKET_TYPE.ENTRIES,
			},
		},
	})

	const swimmingPoolsIds = reduce(
		await SwimmingPool.findAll({
			attributes: ['id'],
		}),
		(ids: any, swimmingPool: SwimmingPoolModel) => {
			ids.push(swimmingPool.id)
			return ids
		},
		[]
	)

	const employee = await User.findOne({
		where: {
			role: {
				[Op.eq]: USER_ROLE.SWIMMING_POOL_EMPLOYEE,
			},
		},
	})

	const discountCode = await DiscountCode.create({
		...createDiscountCode(),
		amount: 20,
	})

	const zipCodes = map([...Array(10).keys()], () =>
		faker.address.zipCode('#####')
	)

	for (let i = 0; i <= 20; i++) {
		// 20 iteration, in every iteration will be created (numberOfOrdersInBulk x 2) orders

		// create orders with seasonal ticket type
		await Order.bulkCreate(
			map([...Array(numberOfOrdersInBulk).keys()], () => {
				const numberOfChildren = faker.random.number(5)
				const numberOfEntries = faker.random.number(120) + 50

				const ticketId = uuidv4()
				const addDiscount = faker.random.boolean()
				const price =
					(seasonalTicketType.price +
						numberOfChildren * seasonalTicketType.childrenPrice) *
					(addDiscount ? (100 - discountCode.amount) / 100 : 1)

				return {
					...createOrder(),
					price: price,
					discount: addDiscount
						? (seasonalTicketType.price +
								numberOfChildren *
									seasonalTicketType.childrenPrice) *
						  (discountCode.amount / 100)
						: 0,
					discountCodeId: addDiscount ? discountCode.id : null,
					tickets: concat(
						[
							{
								...createTicket(ticketId),
								price: seasonalTicketType.price,
								remainingEntries: null,
								profile: {
									...createProfile(),
									zip:
										faker.random.number(100) > 40
											? faker.random.arrayElement(
													zipCodes
											  )
											: null,
									age:
										faker.random.number(100) > 40
											? faker.random.number(80) + 17
											: null,
								},
								parentTicketId: null,
								ticketTypeId: seasonalTicketType.id,
								entries: generateEntries(
									numberOfEntries,
									eventsFrom,
									eventsTo,
									swimmingPoolsIds,
									employee.id
								),
							},
						],
						map([...Array(numberOfChildren).keys()], () => ({
							...createChildrenTicket(),
							price: seasonalTicketType.childrenPrice,
							remainingEntries: null,
							profile: {
								...createProfile(),
								zip:
									faker.random.number(100) > 40
										? faker.random.arrayElement(zipCodes)
										: null,
								age:
									faker.random.number(100) > 40
										? faker.random.number(20) + 3
										: null,
							},
							parentTicketId: ticketId,
							ticketTypeId: seasonalTicketType.id,
							entries: generateEntries(
								numberOfEntries,
								eventsFrom,
								eventsTo,
								swimmingPoolsIds,
								employee.id
							),
						}))
					),
				}
			}),
			{
				include: [
					{
						association: 'paymentOrder',
						include: [{ association: 'paymentResponse' }],
					},
					{
						association: 'tickets',
						include: [
							{ association: 'profile' },
							{ association: 'ticketType' },
							{ association: 'entries' },
						],
					},
				],
			}
		)

		// create orders with entries ticket type
		await Order.bulkCreate(
			map([...Array(numberOfOrdersInBulk).keys()], () => {
				const remainingEntries = faker.random.number(10)
				const numberOfTickets = faker.random.number(3) + 1
				const numberOfEntries = faker.random.number(120) + 50

				const addDiscount = faker.random.boolean()
				const price =
					entriesTicketType.price *
					(addDiscount ? (100 - discountCode.amount) / 100 : 1)

				return {
					...createOrder(),
					price: price,
					discount: addDiscount
						? entriesTicketType.price * (discountCode.amount / 100)
						: 0,
					discountCodeId: addDiscount ? discountCode.id : null,
					tickets: map([...Array(numberOfTickets).keys()], () => ({
						...createTicket(),
						price: entriesTicketType.price,
						remainingEntries: remainingEntries,
						profile: {
							...createProfile(),
							zip:
								faker.random.number(100) > 40
									? faker.random.arrayElement(zipCodes)
									: null,
							age:
								faker.random.number(100) > 40
									? faker.random.number(80) + 17
									: null,
						},
						parentTicketId: null,
						ticketTypeId: entriesTicketType.id,
						entries: generateEntries(
							numberOfEntries,
							eventsFrom,
							eventsTo,
							swimmingPoolsIds,
							employee.id
						),
					})),
				}
			}),
			{
				include: [
					{
						association: 'paymentOrder',
						include: [{ association: 'paymentResponse' }],
					},
					{
						association: 'tickets',
						include: [
							{ association: 'profile' },
							{ association: 'ticketType' },
							{ association: 'entries' },
						],
					},
				],
			}
		)
	}
}

const generateEntries = (
	numberOfEntries: number,
	eventsFrom: string,
	eventsTo: string,
	swimmingPoolsIds: any,
	employeeId: string
) =>
	map([...Array(numberOfEntries).keys()], () => {
		const swimmingPoolId = faker.random.arrayElement(swimmingPoolsIds)
		const entryType = faker.random.arrayElement([
			ENTRY_TYPE.CHECKIN,
			ENTRY_TYPE.CHECKOUT,
		])
		return {
			timestamp: faker.date.between(eventsFrom, eventsTo),
			employeeId: employeeId,
			type: entryType,
			flag: ENTRY_FLAG.MANUAL,
			swimmingPoolId: swimmingPoolId,
		}
	})

async function workflow() {
	try {
		await generateData()

		console.log('Successfully migrated.')
		return process.exit(0)
	} catch (err) {
		console.log(err)
		return process.exit(1)
	}
}

// Start script
workflow()
