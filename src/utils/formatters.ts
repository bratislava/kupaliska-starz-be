import { TicketModel } from './../db/models/ticket';
import { OrderModel } from './../db/models/order';
import config from 'config'
import { IAppConfig } from '../types/interfaces'
import { FileModel } from '../db/models/file'
import { filter, map, reduce } from 'lodash';
import { SwimmingPoolModel } from '../db/models/swimmingPool';
import { UserModel } from '../db/models/user';
import { USER_ROLE } from './enums';
import { TicketTypeModel } from '../db/models/ticketType';
import { DiscountCodeModel } from '../db/models/discountCode';

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
		thumbnailSize: file.thumbnailSizePath ? `${appConfig.host}/${appConfig.filesPath}/${file.thumbnailSizePath}` : undefined,
		smallSize: file.smallSizePath ? `${appConfig.host}/${appConfig.filesPath}/${file.smallSizePath}` : undefined,
		mediumSize: file.mediumSizePath ? `${appConfig.host}/${appConfig.filesPath}/${file.mediumSizePath}` : undefined,
		largeSize: file.largeSizePath ? `${appConfig.host}/${appConfig.filesPath}/${file.largeSizePath}` : undefined,
		altText: file.altText
	}
}

export const formatTicket = (ticket: TicketModel) => {
	if (!ticket) {
		return null
	}

	return {
		id: ticket.id,
		price: ticket.price,
		isChildren: ticket.isChildren,
		email: ticket.profile.email,
		name: ticket.profile.name,
		zip: ticket.profile.zip,
		parentTicketId: ticket.parentTicketId,
		ticketTypeId: ticket.ticketTypeId,
		qrCode: ticket.qrCode
	}
}

export const formatSwimmingPool = (swimmingPool: SwimmingPoolModel, role?: USER_ROLE) => {
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
		image: formatImage(swimmingPool.image)
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
		swimmingPools: user.swimmingPools ? map(user.swimmingPools, (pool) => ({
			id: pool.id,
			name: pool.name
		})): undefined,
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
		price: ticketType.price,
		type: ticketType.type,
		nameRequired: ticketType.nameRequired,
		photoRequired: ticketType.photoRequired,
		childrenAllowed: ticketType.childrenAllowed,
		childrenMaxNumber: ticketType.childrenMaxNumber,
		childrenPrice: ticketType.childrenPrice,
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
		swimmingPools: ticketType.swimmingPools ? map(ticketType.swimmingPools, (pool) => ({
			id: pool.id,
			name: pool.name
		})) : undefined,
		createdAt: ticketType.createdAt,
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
		ticketTypes: discountCode.ticketTypes ? map(discountCode.ticketTypes, (ticketType) => ({
			id: ticketType.id,
			name: ticketType.name
		})): undefined,
		createdAt: discountCode.createdAt,
		usedAt: discountCode.usedAt
	}
}

export const formatOrder = (order: OrderModel) => {
	if (!order) {
		return null
	}

	let adultTickets
	let userName
	if (order.tickets) {
		adultTickets = filter(order.tickets, (ticket) => (ticket.isChildren === false))
		userName = adultTickets.length > 0 ? adultTickets[0].profile.name : order.tickets[0].profile.name
	}


	return {
		id: order.id,
		price: order.price,
		discount: order.discount,
		state: order.state,
		orderNumber: order.orderNumber,
		numberOfTickets: order.tickets ? order.tickets.length : undefined,
		numberOfChildren: order.tickets ? reduce(order.tickets, (number, ticket) => (ticket.isChildren ? number + 1 : number), 0) : undefined,
		email: order.tickets ? order.tickets[0].profile.email : undefined,
		userName: adultTickets ? userName : undefined,
		ticketName: order.tickets ? order.tickets[0].ticketType.name: undefined,
		createdAt: order.createdAt,
		updatedAt: order.updatedAt
	}
}

