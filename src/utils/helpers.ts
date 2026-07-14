import { map } from 'lodash'
import { QueryInterface } from 'sequelize'
import dayjs from 'dayjs'
import { CityAccountUser } from './cityAccountDto'
import i18next from 'i18next'
import { ORDER_STATE, TICKET_CATEGORY } from './enums'
import { TicketModel } from '../db/models/ticket'
import sequelize, { models } from '../db/models'
import { OrderModel } from '../db/models/order'
import logger from './logger'
import ErrorBuilder from './ErrorBuilder'

const cityAccountAuthUserURL = `${process.env.CITY_ACCOUNT_BE_URL}/auth/user`

export const httpErrorStatusString = (response: Response) => {
	return `HTTP Error Response: ${response.status} ${response.statusText}`
}

export const checkTableExists = async (queryInterface: QueryInterface, table: string) => {
	const tables = await queryInterface.showAllTables()
	return tables.find((item: string) => item === table)
}

export const getAllAges = (ageInterval: number, ageMinimum: number) => {
	const allAges: (string | null)[] = map(
		[...Array(Math.ceil(100 / ageInterval) - 1).keys()],
		(index) => {
			const min = index * ageInterval + ageMinimum
			const max = index * ageInterval + (ageInterval - 1) + ageMinimum
			return `${min}-${max}`
		}
	)
	allAges.push(null) // needed when age is not filled (SQL returns null value)
	return allAges
}

// TODO this should live in authorization middleware and attach the city account data to the request object
export const getCityAccountData = async (accessToken: string) => {
	const response = await fetch(cityAccountAuthUserURL, {
		headers: {
			Authorization: accessToken,
		},
	})

	if (!response.ok) {
		logger.error(httpErrorStatusString(response))

		logger.error(`Error fetching account - Error body: ${await response.text()}`)

		if (response.status === 401) {
			throw new ErrorBuilder(401, 'Unauthorized')
		}
		throw new ErrorBuilder(
			500,
			`Error occurred while fetching user from "${cityAccountAuthUserURL}"`
		)
	}

	return (await response.json()) as Partial<CityAccountUser>
}

// https://stackoverflow.com/a/39077686
export const hexToRgbString = (hex: string) => {
	const pairs = hex
		.replace(/^#?([a-f\d])([a-f\d])([a-f\d])$/i, (m, r, g, b) => '#' + r + r + g + g + b + b)
		.substring(1)
		.match(/.{2}/g)
	if (!pairs) {
		throw new Error('Invalid hex color')
	}
	const arr = pairs.map((x: string) => parseInt(x, 16))
	return `rgb(${arr[0]},${arr[1]},${arr[2]})`
}

// separate walletPass translation keys even for reused strings
// wallets have very limited space and could be easy to miss when the text changes in the future
export const getWalletPassTicketName = (ticket: TicketModel) =>
	ticket.isChildren
		? i18next.t('translation:walletPass.childrenSeasonTicket')
		: ticket.getCategory() === TICKET_CATEGORY.SENIOR_OR_DISABLED
			? i18next.t('translation:walletPass.seniorOrDisabledTicket')
			: ticket.ticketType.name

export const getWalletPassTicketDescription = (ticket: TicketModel) =>
	ticket.isChildren
		? ticket.withAdult()
			? i18next.t('translation:walletPass.childrenWithAdultText')
			: i18next.t('translation:walletPass.childrenWithoutAdultText')
		: ticket.getCategory() === TICKET_CATEGORY.SENIOR_OR_DISABLED
			? i18next.t('translation:walletPass.seniorOrDisabledText')
			: // no description text for adult ticket
				''
export function isDefined<T>(value: T | undefined | null): value is T {
	return value !== undefined && value !== null
}

/**
 * Get price after discount.
 */
export const getDiscount = (ticketPriceWithVat: number, discountPercent: number) => {
	const inverseDiscountInPercent = 100 - (discountPercent ?? 0)
	const priceWithDiscount = Math.round((ticketPriceWithVat * inverseDiscountInPercent) / 100)

	return {
		newTicketsPrice: priceWithDiscount,
		discount: ticketPriceWithVat - priceWithDiscount,
	}
}

export const printDecimal2 = (value: number) => {
	// maybe we should dinero.js or currency.js to handle this?
	return (value / 100).toFixed(2).replace('.', ',')
}

/**
 * Marks the order as PAID and assigns it the next sequential order number of the year.
 * Idempotent.
 *
 * @returns true if the order was transitioned to PAID by this call,
 * false if it was already paid (concurrent request or earlier processing)
 */
export const markOrderPaid = async (order: OrderModel): Promise<boolean> => {
	const { Order } = models
	const now = new Date().getFullYear()

	return sequelize.transaction(async (t) => {
		// lock the order row so concurrent attempts to pay the same order serialize here
		const lockedOrder = await Order.findOne({
			where: {
				id: order.id,
			},
			lock: t.LOCK.UPDATE,
			transaction: t,
		})

		if (!lockedOrder || lockedOrder.isPaid()) {
			return false
		}

		// Locking the row of the currently latest order would not prevent two concurrent transactions
		// from computing the same next number
		await sequelize.query(`SELECT pg_advisory_xact_lock(hashtext('orderNumberInYear'))`, {
			transaction: t,
		})

		const latestOrder = await Order.findOne({
			where: {
				orderPaidInYear: now,
			},
			order: [['orderNumberInYear', 'DESC']],
			transaction: t,
		})

		const nextOrderNumber = latestOrder ? latestOrder.orderNumberInYear + 1 : 1

		await order.update(
			{
				state: ORDER_STATE.PAID,
				orderNumberInYear: nextOrderNumber,
				orderPaidInYear: now,
			},
			{ transaction: t }
		)
		return true
	})
}

export const calculateAge = (dateOfBirth: string) => {
	const age = dayjs().diff(dayjs(dateOfBirth), 'year')
	return age
}

export const getAdultsAndChildrenCountForTicketType = (
	ticketsWithTicketType: {
		ticketType: { id: string }
		isChildTicket: boolean
	}[]
) => {
	const numberOfChildrenForTicketType = ticketsWithTicketType.filter(
		(ticketWithTicketType) => ticketWithTicketType.isChildTicket
	).length
	const numberOfAdultsForTicketType = ticketsWithTicketType.length - numberOfChildrenForTicketType

	return { numberOfAdultsForTicketType, numberOfChildrenForTicketType }
}
