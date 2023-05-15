import { Request, Response, NextFunction } from 'express'
import { models } from '../../../db/models'
import {
	ENTRY_TYPE,
	ORDER_STATE,
	textColorsMap,
	TICKET_CATEGORY,
} from '../../../utils/enums'
import { generateQrCode } from '../../../utils/qrCodeGenerator'
import { getDataAboutCurrentUser } from '../../../utils/getDataCurrentUser'

const { Ticket, Order, TicketType, Entry, SwimmingPool } = models

interface GetEntry {
	id: string
	poolName: string
	from: number
	to: number | null
}

interface GetTicket {
	id: string
	type: string
	remainingEntries: number
	ownerName: string
	ownerId: string
	usedDate: string
	entries: GetEntry[]
	qrCode: string | Buffer
	price: number
	ticketColor: TicketColors | null
	age: null | number
}

interface TicketColors {
	text: string
	background: string
}

export const workflow = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	try {
		const swimmingLoggedUser = await getDataAboutCurrentUser(req)
		const tickets = await Ticket.findAll({
			where: { loggedUserId: swimmingLoggedUser.id },
			order: [['createdAt', 'DESC']],
			include: [
				{
					association: 'profile',
				},
			],
		})

		let result: GetTicket[] = []
		for (const ticket of tickets) {
			let ticketResult: GetTicket = {
				id: '',
				type: '',
				remainingEntries: 0,
				ownerName: '',
				ownerId: '',
				usedDate: '',
				entries: [],
				qrCode: '',
				price: 0,
				ticketColor: null,
				age: null,
			}

			const order = await Order.findByPk(ticket.orderId)
			if (order.state === ORDER_STATE.PAID) {
				ticketResult.id = ticket.id
				ticketResult.price = ticket.price
				ticketResult.remainingEntries = ticket.remainingEntries

				const ticketType = await TicketType.findByPk(
					ticket.ticketTypeId
				)
				ticketResult.type = ticketType.name
				const qrCode = await generateQrCode(
					ticket.id,
					'buffer',
					ticketType.getExpiresIn()
				)
				ticketResult.qrCode =
					'data:image/png;base64, ' +
					Buffer.from(qrCode).toString('base64')

				ticketResult.ownerName = ticket.profile.name
				ticketResult.age = ticket.profile.age
				if (ticket.associatedSwimmerId) {
					ticketResult.ownerId = ticket.associatedSwimmerId
				} else {
					ticketResult.ownerId = ticket.swimmingLoggedUserId
				}

				if (
					ticketType.childrenAgeFrom &&
					ticketType.childrenAgeTo &&
					ticketType.childrenAgeToWithAdult
				) {
					if (
						ticketResult.age >= ticketType.childrenAgeFrom &&
						ticketResult.age <= ticketType.childrenAgeToWithAdult
					) {
						ticketResult.ticketColor =
							textColorsMap[TICKET_CATEGORY.CHILDREN_WITH_ADULT]
					} else if (
						ticketResult.age > ticketType.childrenAgeToWithAdult &&
						ticketResult.age <= ticketType.childrenAgeTo
					) {
						ticketResult.ticketColor =
							textColorsMap[
								TICKET_CATEGORY.CHILDREN_WITHOUT_ADULT
							]
					} else {
						ticketResult.ticketColor =
							textColorsMap[TICKET_CATEGORY.ADULT]
					}
				} else {
					ticketResult.ticketColor =
						textColorsMap[TICKET_CATEGORY.ADULT]
				}

				ticketResult.entries = await getEntries(ticket.id)
				result.push(ticketResult)
			}
		}

		return res.json(result)
	} catch (err) {
		return next(err)
	}
}

const getEntries = async (ticketId: string) => {
	const entries = await Entry.findAll({
		where: { ticketId: ticketId },
		order: [['timestamp', 'ASC']],
	})
	let result: GetEntry[] = []
	let entryResult: GetEntry | null = null
	for (const entry of entries) {
		if (entry.type === ENTRY_TYPE.CHECKIN) {
			if (entryResult) {
				result.push(entryResult)
				entryResult = null
			}
			const pool = await SwimmingPool.findByPk(entry.swimmingPoolId)
			entryResult = {
				id: entry.id,
				from: entry.timestamp.getTime(),
				to: null,
				poolName: pool.name,
			}
		} else if (entryResult && entry.type === ENTRY_TYPE.CHECKOUT) {
			entryResult.to = entry.timestamp.getTime()
			result.push(entryResult)
			entryResult = null
		}
	}
	if (entryResult) {
		result.push(entryResult)
		entryResult = null
	}
	return result.reverse()
}
