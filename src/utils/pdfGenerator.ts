import { textColorsMap, TICKET_CATEGORY } from './enums'
import PDFDocument from 'pdfkit'
import { TicketModel } from '../db/models/ticket'
import i18next from 'i18next'
import { Base64Encode } from 'base64-stream'
import { getChildrenTicketName } from './translationsHelpers'

export const generatePdf = async (tickets: TicketModel[]): Promise<string> => {
	let ticketsForPdf = [...tickets]

	let numberOfChildren = 0
	let numberOfAdults = 0
	let numberOfChildrenWithAdult = 0
	for (const ticket of ticketsForPdf) {
		if (ticket.isChildren) {
			numberOfChildren++
			numberOfChildrenWithAdult += ticket.withAdult() ? 1 : 0
		} else {
			numberOfAdults++
		}
	}

	ticketsForPdf = sortTickets(ticketsForPdf)

	let startPadding = 79.5
	let endPadding = 1

	const rowPadding = 130
	const rowPaddingChildren = 190
	const qrCodeHeight = 240
	const qrCodeLeftPadding = 56.25

	const pageHeight =
		startPadding +
		numberOfChildren * (rowPaddingChildren + qrCodeHeight) +
		numberOfAdults * (rowPadding + qrCodeHeight) +
		endPadding

	const doc = new PDFDocument({
		size: [352.5, pageHeight],
		margins: {
			top: 30,
			bottom: 15,
			left: 40,
			right: 40,
		},
	})

	doc.info['Title'] = i18next.t('translation:ticketsQrCodes')
	doc.info['Author'] = 'STARZ Kúpaliská'

	let finalBase64String = ''
	const stream = doc.pipe(new Base64Encode())

	let adultsBackgroundHeight = 0
	if (numberOfAdults > 0) {
		adultsBackgroundHeight =
			startPadding +
			numberOfAdults * (rowPadding + qrCodeHeight) +
			(ticketsForPdf.length === numberOfAdults ? endPadding : -20)
		doc.rect(0, 0, 352.5, adultsBackgroundHeight).fillAndStroke(
			textColorsMap[TICKET_CATEGORY.ADULT].background
		)

		endPadding += 20
	}

	let childrenWithAdultBackgroundHeight = 0
	if (numberOfChildrenWithAdult > 0) {
		childrenWithAdultBackgroundHeight =
			(numberOfAdults === 0 ? startPadding : 0) +
			numberOfChildrenWithAdult * (rowPaddingChildren + qrCodeHeight) +
			(ticketsForPdf.length === numberOfAdults + numberOfChildrenWithAdult
				? endPadding
				: 0)

		doc.rect(
			0,
			adultsBackgroundHeight,
			352.5,
			childrenWithAdultBackgroundHeight
		).fillAndStroke(
			textColorsMap[TICKET_CATEGORY.CHILDREN_WITHOUT_ADULT].background
		)
	}

	doc.fill(getTicketTextColor(ticketsForPdf[0])).stroke()

	doc.font('resources/fonts/WorkSans-Bold.ttf')

	doc.fontSize(18).text('STARZ', { align: 'center' })

	for (const ticket of ticketsForPdf) {
		doc.fill(getTicketTextColor(ticket)).stroke()

		doc.image(ticket.qrCode, qrCodeLeftPadding, startPadding, {
			fit: [qrCodeHeight, qrCodeHeight],
			align: 'center',
		})

		const name = ticket.isChildren
			? getChildrenTicketName(ticket.ticketType.name)
			: ticket.ticketType.name

		doc.fontSize(18)
			.font('resources/fonts/WorkSans-Bold.ttf')
			.text(name, doc.x, startPadding + qrCodeHeight + 22.5, {
				align: 'center',
			})
			.moveDown(0.5)

		doc.fontSize(12)
			.font('resources/fonts/WorkSans-Medium.ttf')
			.text(ticket.profile.name, { align: 'center' })

		if (ticket.isChildren) {
			doc.moveDown(0.12)
			doc.fontSize(12)
				.font('resources/fonts/WorkSans-Medium.ttf')
				.text(
					`${ticket.profile.age} ${i18next.t('year', {
						count: ticket.profile.age,
					})}`,
					{ align: 'center' }
				)

			doc.moveDown(1)
			doc.fontSize(12)
				.font('resources/fonts/WorkSans-Medium.ttf')
				.text(
					ticket.withAdult()
						? i18next.t('translation:allowedOnly')
						: i18next.t('translation:allowedAlsoWith'),
					{ align: 'center' }
				)
			doc.moveDown(0.12)
			doc.fontSize(12)
				.font('resources/fonts/WorkSans-Medium.ttf')
				.text(
					ticket.withAdult()
						? i18next.t('translation:withEscort') + '.'
						: i18next.t('translation:withoutEscort') + '.',
					{ align: 'center' }
				)
			startPadding += qrCodeHeight + rowPaddingChildren
		} else {
			startPadding += qrCodeHeight + rowPadding
		}
	}

	doc.end()

	return await new Promise((resolve, reject) => {
		stream.on('data', (chunk) => (finalBase64String += chunk))
		stream.on('end', () => resolve(finalBase64String))
	})
}

const getTicketTextColor = (ticket: TicketModel) => {
	return textColorsMap[ticket.getCategory()].text
}

/**
 * Sort tickets by adults, children with adult, children
 */
const sortTickets = (ticketsForPdf: TicketModel[]) => {
	ticketsForPdf.sort((a, b) => {
		if (a.isChildren === false && b.isChildren === false) {
			return 0
		}
		if (a.isChildren === false) {
			return -1
		}
		if (b.isChildren === false) {
			return 1
		}

		if (a.withAdult() && b.withAdult() === false) {
			return -1
		} else {
			return 1
		}
	})

	return ticketsForPdf
}
