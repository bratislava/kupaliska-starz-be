import { map } from 'lodash'
import { QueryInterface } from 'sequelize'
import fetch from 'node-fetch'
import { CityAccountUser } from './cityAccountDto'
import ErrorBuilder from './ErrorBuilder'
import i18next from 'i18next'
import { TICKET_CATEGORY } from './enums'
import { TicketModel } from '../db/models/ticket'
import '@js-joda/timezone'
import { ChronoUnit, ZoneId, ZonedDateTime } from '@js-joda/core'

export const checkTableExists = async (
	queryInterface: QueryInterface,
	table: string
) => {
	const tables: any = await queryInterface.showAllTables()
	return tables.find((item: string) => item === table)
}

export const getLocalTimezoneTime = (): string =>
	ZonedDateTime.now(ZoneId.of('Europe/Bratislava'))
		.toLocalTime()
		.truncatedTo(ChronoUnit.MINUTES)
		.toString()

export const getHours = (time: string): number => {
	return Number(time.substr(0, 2))
}

export const getMinutes = (time: string): number => {
	return Number(time.substr(3, 2))
}

export const getAllAges = (ageInterval: number, ageMinimum: number) => {
	const allAges = map(
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

export const getCityAccountData = async (accessToken: string) => {
	const result = await fetch(`${process.env.CITY_ACCOUNT_BE_URL}/auth/user`, {
		headers: {
			Authorization: accessToken,
		},
	})
	if (!result.ok) {
		if (result.status === 401) {
			throw new ErrorBuilder(401, 'Unauthorized')
		} else {
			throw new Error('Error fetching account')
		}
	}
	return result.json() as Partial<CityAccountUser>
}

// https://stackoverflow.com/a/39077686
export const hexToRgbString = (hex: string) => {
	const arr = hex
		.replace(
			/^#?([a-f\d])([a-f\d])([a-f\d])$/i,
			(m, r, g, b) => '#' + r + r + g + g + b + b
		)
		.substring(1)
		.match(/.{2}/g)
		.map((x: string) => parseInt(x, 16))
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
