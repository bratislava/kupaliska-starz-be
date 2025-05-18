import { SwimmingPoolModel } from './../db/models/swimmingPool'
import { SwimmingLoggedUserModel } from './../db/models/swimmingLoggedUser'
import { TicketModel } from './../db/models/ticket'
import { OrderModel } from './../db/models/order'
import config from 'config'
import { IAppConfig } from '../types/interfaces'
import { FileModel } from '../db/models/file'
import { Dictionary, filter, map, reduce } from 'lodash'
import { UserModel } from '../db/models/user'
import { USER_ROLE } from './enums'
import { TicketTypeModel } from '../db/models/ticketType'
import { DiscountCodeModel } from '../db/models/discountCode'
import i18next from 'i18next'
import { AssociatedSwimmerModel } from '../db/models/associatedSwimmer'

const appConfig: IAppConfig = config.get('app')

export const formatFile = (file: FileModel) => {
	if (!file) {
		return null
	}
	return `${appConfig.host}/${appConfig.filesPath}/${file.originalPath}`
}

export const formatImage = (file: FileModel) => {
	if (!file) {
		return null
	}
	return {
		originalFile: `${appConfig.host}/${appConfig.filesPath}/${file.originalPath}`,
		thumbnailSize: file.thumbnailSizePath
			? `${appConfig.host}/${appConfig.filesPath}/${file.thumbnailSizePath}`
			: undefined,
		smallSize: file.smallSizePath
			? `${appConfig.host}/${appConfig.filesPath}/${file.smallSizePath}`
			: undefined,
		mediumSize: file.mediumSizePath
			? `${appConfig.host}/${appConfig.filesPath}/${file.mediumSizePath}`
			: undefined,
		largeSize: file.largeSizePath
			? `${appConfig.host}/${appConfig.filesPath}/${file.largeSizePath}`
			: undefined,
		altText: file.altText,
	}
}

export const formatTicket = (ticket: TicketModel) => {
	if (!ticket) {
		return null
	}

	return {
		id: ticket.id,
		priceWithTax: ticket.priceWithTax,
		priceWithoutTax: ticket.priceWithoutTax,
		priceTax: ticket.priceTax,
		isChildren: ticket.isChildren,
		email: ticket.profile.email,
		name: ticket.profile.name,
		zip: ticket.profile.zip,
		parentTicketId: ticket.parentTicketId,
		ticketTypeId: ticket.ticketType.id,
		qrCode: ticket.qrCode,
	}
}

export const formatSwimmingPool = (
	swimmingPool: SwimmingPoolModel,
	role?: USER_ROLE
) => {
	if (!swimmingPool) {
		return null
	}

	return {
		id: swimmingPool.id,
		name: swimmingPool.name,
		description: swimmingPool.description,
		expandedDescription: swimmingPool.expandedDescription,
		waterTemp: swimmingPool.waterTemp,
		maxCapacity: swimmingPool.maxCapacity,
		openingHours: swimmingPool.openingHours,
		facilities: swimmingPool.facilities,
		locationUrl: swimmingPool.locationUrl,
		createdAt: swimmingPool.createdAt,
		updatedAt: swimmingPool.updatedAt,
		image: formatImage(swimmingPool.image),
		ordering: swimmingPool.ordering,
	}
}

export const formatUser = (user: UserModel) => {
	if (!user) {
		return null
	}
	return {
		id: user.id,
		name: user.name,
		email: user.email,
		isConfirmed: user.isConfirmed,
		role: user.role,
		swimmingPools: user.swimmingPools
			? map(user.swimmingPools, (pool) => ({
					id: pool.id,
					name: pool.name,
			  }))
			: undefined,
		createdAt: user.createdAt,
		updatedAt: user.updatedAt,
		deletedAt: user.deletedAt,
	}
}

export const formatTicketType = (ticketType: TicketTypeModel) => {
	if (!ticketType) {
		return null
	}
	return {
		id: ticketType.id,
		name: ticketType.name,
		description: ticketType.description,
		priceWithTax: ticketType.priceWithTax,
		priceWithoutTax: ticketType.priceWithoutTax,
		priceTax: ticketType.priceTax,
		type: ticketType.type,
		nameRequired: ticketType.nameRequired,
		photoRequired: ticketType.photoRequired,
		childrenAllowed: ticketType.childrenAllowed,
		childrenMaxNumber: ticketType.childrenMaxNumber,
		childrenPriceWithTax: ticketType.childrenPriceWithTax,
		childrenPriceWithoutTax: ticketType.childrenPriceWithoutTax,
		childrenPriceTax: ticketType.childrenPriceTax,
		childrenAgeFrom: ticketType.childrenAgeFrom,
		childrenAgeTo: ticketType.childrenAgeTo,
		childrenAgeToWithAdult: ticketType.childrenAgeToWithAdult,
		childrenPhotoRequired: ticketType.childrenPhotoRequired,
		entriesNumber: ticketType.entriesNumber,
		hasEntranceConstraints: ticketType.hasEntranceConstraints,
		entranceFrom: ticketType.entranceFrom,
		entranceTo: ticketType.entranceTo,
		hasTicketDuration: ticketType.hasTicketDuration,
		ticketDuration: ticketType.ticketDuration,
		validFrom: ticketType.validFrom,
		validTo: ticketType.validTo,
		isSeniorIsDisabled: ticketType.isSeniorIsDisabled,
		swimmingPools: ticketType.swimmingPools
			? map(ticketType.swimmingPools, (pool) => ({
					id: pool.id,
					name: pool.name,
			  }))
			: undefined,
		createdAt: ticketType.createdAt,
		deletedAt: ticketType.deletedAt,
	}
}

export const formatDiscountCode = (discountCode: DiscountCodeModel) => {
	if (!discountCode) {
		return null
	}
	return {
		id: discountCode.id,
		code: discountCode.code,
		amount: discountCode.amount,
		validFrom: discountCode.validFrom,
		validTo: discountCode.validTo,
		ticketTypes: discountCode.ticketTypes
			? map(discountCode.ticketTypes, (ticketType) => ({
					id: ticketType.id,
					name: ticketType.name,
			  }))
			: undefined,
		customerEmail:
			discountCode.order && discountCode.order.tickets[0]
				? discountCode.order.tickets[0].profile.email
				: '',
		createdAt: discountCode.createdAt,
		usedAt: discountCode.usedAt,
	}
}

export const formatOrder = (order: OrderModel) => {
	if (!order) {
		return null
	}

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
		id: order.id,
		price: order.price,
		discount: order.discount,
		state: order.state,
		orderNumber: order.orderNumber,
		numberOfTickets: order.tickets ? order.tickets.length : undefined,
		numberOfChildren: order.tickets
			? reduce(
					order.tickets,
					(number, ticket) =>
						ticket.isChildren ? number + 1 : number,
					0
			  )
			: undefined,
		email: order.tickets ? order.tickets[0].profile.email : undefined,
		userName: adultTickets ? userName : undefined,
		ticketName: order.tickets
			? order.tickets[0].ticketType.name
			: undefined,
		createdAt: order.createdAt,
		updatedAt: order.updatedAt,
	}
}

export const formatVisits = (
	allSwimmingPools: SwimmingPoolModel[],
	allAges: string[],
	swimmingPoolsVisits: Dictionary<
		{
			id: string
			range: {
				age: string
				value: string
			}
		}[]
	>,
	swimmingPoolsAverageVisits: {
		id: string
		total: string
	}[],
	valueFormat = 'number'
) => {
	return map(allSwimmingPools, (swimmingPool) => {
		const zero = valueFormat === 'number' ? 0 : '00:00:00'
		const swimmingPoolAverageVisits = filter(
			swimmingPoolsAverageVisits,
			(obj) => obj.id === swimmingPool.id
		)
		const average =
			swimmingPoolAverageVisits.length > 0
				? swimmingPoolAverageVisits[0].total
				: zero

		return {
			id: swimmingPool.id,
			name: swimmingPool.name,
			total: average,
			ages: reduce(
				allAges,
				(allRanges, age) => {
					const findAge = filter(
						swimmingPoolsVisits[swimmingPool.id],
						(obj) => obj.range.age === age
					)

					if (findAge.length > 0) {
						let ageTitle = findAge[0].range.age
						if (findAge[0].range.age === null) {
							ageTitle = i18next.t('none')
						}
						allRanges[ageTitle] = findAge[0].range.value
					} else {
						allRanges[age === null ? i18next.t('none') : age] = zero
					}
					return allRanges
				},
				{} as any
			),
		}
	})
}

export const formatSwimmingLoggedUser = (
	swimmingLoggedUser: SwimmingLoggedUserModel
) => {
	if (!swimmingLoggedUser) {
		return null
	}

	return {
		id: swimmingLoggedUser.id,
		externalId: swimmingLoggedUser.externalCognitoId,
		age: swimmingLoggedUser.age,
		zip: swimmingLoggedUser.zip,
		image: swimmingLoggedUser.image,
		createdAt: swimmingLoggedUser.createdAt,
		updatedAt: swimmingLoggedUser.updatedAt,
		deletedAt: swimmingLoggedUser.deletedAt,
	}
}

export const formatAssociatedSwimmer = (
	associatedSwimmer: AssociatedSwimmerModel
) => {
	if (!associatedSwimmer) {
		return null
	}

	return {
		id: associatedSwimmer.id,
		swimmingLoggedUserId: associatedSwimmer.swimmingLoggedUserId,
		firstname: associatedSwimmer.firstname,
		lastname: associatedSwimmer.lastname,
		age: associatedSwimmer.age,
		zip: associatedSwimmer.zip,
		image: associatedSwimmer.image,
		createdAt: associatedSwimmer.createdAt,
		updatedAt: associatedSwimmer.updatedAt,
		deletedAt: associatedSwimmer.deletedAt,
	}
}
