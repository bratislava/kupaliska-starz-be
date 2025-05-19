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
	// adult tickets are either all for seniors/ztp or all for "regular" adults - so one senior/ztp is all we need to look for
	const isSeniorOrDisabledTicket = ticketsForPdf.some(
		(t) => t.getCategory() === TICKET_CATEGORY.SENIOR_OR_DISABLED
	)
	for (const ticket of ticketsForPdf) {
		if (ticket.isChildren) {
			numberOfChildren++
			numberOfChildrenWithAdult += ticket.withAdult() ? 1 : 0
		} else {
			numberOfAdults++
		}
	}
	const numberOfChildrenWithoutAdult =
		numberOfChildren - numberOfChildrenWithAdult

	ticketsForPdf = sortTickets(ticketsForPdf)

	let startPadding = 79.5
	let endPadding = 1

	const rowPadding = isSeniorOrDisabledTicket ? 220 : 130
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
			textColorsMap[
				isSeniorOrDisabledTicket
					? TICKET_CATEGORY.SENIOR_OR_DISABLED
					: TICKET_CATEGORY.ADULT
			].background
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
			textColorsMap[TICKET_CATEGORY.CHILDREN_WITH_ADULT].background
		)
	}

	let childrenWithoutAdultBackgroundHeight = 0
	if (numberOfChildrenWithoutAdult > 0) {
		childrenWithoutAdultBackgroundHeight =
			(numberOfAdults === 0 && numberOfChildrenWithAdult === 0
				? startPadding
				: 0) +
			numberOfChildrenWithoutAdult * (rowPaddingChildren + qrCodeHeight) +
			endPadding

		doc.rect(
			0,
			adultsBackgroundHeight + childrenWithAdultBackgroundHeight,
			352.5,
			childrenWithoutAdultBackgroundHeight
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
			? getChildrenTicketName()
			: isSeniorOrDisabledTicket
			? i18next.t('translation:seniorOrDisabledTicket')
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
					`${i18next.t('year', {
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
		} else if (isSeniorOrDisabledTicket) {
			doc.moveDown(0.12)
			doc.fontSize(12)
				.font('resources/fonts/WorkSans-Medium.ttf')
				.text(
					`${i18next.t('year', {
						count: ticket.profile.age,
					})}`,
					{ align: 'center' }
				)

			doc.moveDown(1)
			doc.fontSize(12)
				.font('resources/fonts/WorkSans-Medium.ttf')
				.text(i18next.t('translation:seniorOrDisabledText'), {
					align: 'center',
				})
			startPadding += qrCodeHeight + rowPadding
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
 * Sort tickets by adults, ZTP, children with adult, children
 */
const sortTickets = (ticketsForPdf: TicketModel[]) => {
	ticketsForPdf.sort((a, b) => {
		if (a.isChildren === false && b.isChildren === false) {
			if (a.getCategory() === b.getCategory()) {
				return 0
			}
			if (a.getCategory() === TICKET_CATEGORY.SENIOR_OR_DISABLED) {
				return -1
			} else if (b.getCategory() === TICKET_CATEGORY.SENIOR_OR_DISABLED) {
				return 1
			}
			// shouldn't happen in 2023, but in case more categories are added we will not sort by them presently
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

export const generatePdfTaxes = async (
	tickets: TicketModel[],
	orderPriceWithTax: number,
	discount: number
): Promise<string> => {
	let ticketsForPdf = [...tickets]

	let numberOfChildren = 0
	let numberOfAdults = 0

	for (const ticket of ticketsForPdf) {
		if (ticket.isChildren) {
			numberOfChildren++
		} else {
			numberOfAdults++
		}
	}

	const doc = new PDFDocument({
		size: 'A4',
		margins: {
			top: 30,
			bottom: 15,
			left: 40,
			right: 40,
		},
	})

	doc.info['Title'] = i18next.t('translation:pdfTaxTitleDetails')
	doc.info['Author'] = 'STARZ Kúpaliská'

	let finalBase64String = ''
	const stream = doc.pipe(new Base64Encode())

	doc.fill('#000000').stroke()

	doc.font('resources/fonts/WorkSans-Medium.ttf')

	const fontSizeSmall = 7
	const fontSizeMedium = 8
	const fontSizeLarge = 12

	doc.table({
		rowStyles: {
			padding: { left: '1em', right: '1em' },
			border: [0, 0, 0, 0],
			backgroundColor: '#ccc',
		},
		data: [
			[
				{
					font: { size: fontSizeLarge },
					text: i18next.t('translation:pdfTaxTitle'), // ZJEDNODUŠENÝ DAŇOVÝ DOKLAD
				},
				{
					font: { size: fontSizeLarge },
					align: { x: 'right', y: 'top' },
					text: 'TODO ciselny rad',
				},
			],
		],
	})

	let leftPadding = 50

	doc.fontSize(fontSizeMedium).text(
		i18next.t('translation:pdfTaxWhereSite'),
		leftPadding
	) // k nákupu na kupaliska.bratislava.sk

	doc.moveDown()

	doc.fontSize(fontSizeMedium).font('resources/fonts/WorkSans-Bold.ttf').text(
		i18next.t('translation:pdfTaxCompanyName'), // Správa telovýchovných a rekreačných zariadení hlavného mesta Slovenskej Republiky
		leftPadding,
		undefined,
		{
			width: 180,
		}
	)

	doc.font('resources/fonts/WorkSans-Medium.ttf')

	doc.fontSize(fontSizeMedium).text(
		i18next.t('translation:pdfTaxAddress'),
		leftPadding
	) // Junácka 4
	doc.fontSize(fontSizeMedium).text(
		i18next.t('translation:pdfTaxCity'),
		leftPadding
	) // 831 04 Bratislava 3
	doc.fontSize(fontSizeMedium).text(
		i18next.t('translation:pdfTaxCountry'),
		leftPadding
	) // Slovenská republika

	doc.moveDown()

	doc.table({
		defaultStyle: { border: false, width: 110 },
		rowStyles: {
			border: [0, 0, 0, 0],
			backgroundColor: '#FFFFFF',
		},
		data: [
			[
				{
					font: { size: fontSizeMedium },
					text: i18next.t('translation:pdfTaxIco'), // IČO: 00179663
				},
				{
					font: { size: fontSizeMedium },
					align: { x: 'right', y: 'top' },
					text: '00179663',
				},
			],
			[
				{
					font: { size: fontSizeMedium },
					text: i18next.t('translation:pdfTaxDics'), // DIČ: 2020801695
				},
				{
					align: { x: 'right', y: 'top' },
					text: '2020801695',
				},
			],
			[
				{
					font: { size: fontSizeMedium },
					text: i18next.t('translation:pdfTaxIcDph'), // IČ DPH: SK2020801695
				},
				{
					align: { x: 'right', y: 'top' },
					text: ' SK2020801695',
				},
			],
		],
	})

	doc.fontSize(fontSizeMedium).text(
		i18next.t('translation:pdfTaxTaxPayer'),
		leftPadding
	) // Platiteľ DPH
	doc.moveDown()

	doc.table({
		defaultStyle: { border: false, width: 110 },
		rowStyles: {
			border: [0, 0, 0, 0],
			backgroundColor: '#FFFFFF',
		},
		data: [
			[
				{
					font: { size: fontSizeMedium },
					text: i18next.t('translation:pdfTaxPhone'), // TELEFÓN: +421 2 443 733 27
				},
				{
					font: { size: fontSizeMedium },
					align: { x: 'right', y: 'top' },
					text: '+421 2 443 733 27',
				},
			],
			[
				{
					font: { size: fontSizeMedium },
					text: i18next.t('translation:pdfTaxEmail'), // EMAIL: starz@starz.sk
				},
				{
					font: { size: fontSizeMedium },
					align: { x: 'right', y: 'top' },
					text: 'starz@starz.sk',
				},
			],
		],
	})
	doc.moveDown()

	doc.table({
		defaultStyle: { border: false, width: 110 },
		rowStyles: {
			border: [0, 0, 0, 0],
			backgroundColor: '#FFFFFF',
		},
		data: [
			[
				{
					font: { size: fontSizeMedium },
					text: i18next.t('translation:pdfTaxDate'), // Dátum uskutočnenia plnenia/Dátum úhrady:
				},
				{
					font: { size: fontSizeMedium },
					align: { x: 'right', y: 'top' },
					text:
						ticketsForPdf.length > 0
							? ticketsForPdf[0].createdAt.toLocaleDateString(
									'sk-SK'
							  )
							: '', // 18.05.2025
				},
			],
			[
				{
					font: { size: fontSizeMedium },
					text: i18next.t('translation:pdfTaxPaymentMethod'), // Forma úhrady:
				},
				{
					font: { size: fontSizeMedium },
					align: { x: 'right', y: 'top' },
					text: i18next.t('translation:pdfTaxPaymentMethodCard'), // online platobnou kartou
				},
			],
		],
	})
	doc.moveDown()

	doc.font('resources/fonts/WorkSans-Bold.ttf')

	doc.table({
		defaultStyle: { border: false },
		columnStyles: [200, '*', '*', '*', '*', '*'],
		rowStyles: (i: number) => {
			if (i === 0) {
				return {
					border: false,
					padding: { left: '1em', right: '1em' },
					backgroundColor: '#ccc',
				}
			} else {
				return {
					border: false,
					padding: { left: '1em', right: '1em' },
					backgroundColor: '#FFFFFF',
				}
			}
		},
		data: [
			[
				{
					font: { size: fontSizeSmall },
					//doc.font('resources/fonts/WorkSans-Bold.ttf').text(
					text: i18next.t('translation:pdfTaxDescription'), // Popis položky
				},
				{
					align: { x: 'right', y: 'top' },
					font: { size: fontSizeSmall },
					//doc.font('resources/fonts/WorkSans-Bold.ttf').text(
					text: i18next.t('translation:pdfTaxQuantityHeading'), // Množstvo/MJ
				},
				{
					align: { x: 'right', y: 'top' },
					font: { size: fontSizeSmall },
					//doc.font('resources/fonts/WorkSans-Bold.ttf').text(
					text: i18next.t('translation:pdfTaxPriceHeading'), // Cena za MJ
				},
				{
					align: { x: 'right', y: 'top' },
					font: { size: fontSizeSmall },
					//doc.font('resources/fonts/WorkSans-Bold.ttf').text(
					text: i18next.t('translation:pdfTaxTotalWithoutTaxHeading'), // Celkom bez DPH
				},
				{
					align: { x: 'right', y: 'top' },
					font: { size: fontSizeSmall },
					//doc.font('resources/fonts/WorkSans-Bold.ttf').text(
					text: i18next.t('translation:pdfTaxTaxHeading'), // DPH
				},
				{
					align: { x: 'right', y: 'top' },
					font: { size: fontSizeSmall },
					//doc.font('resources/fonts/WorkSans-Bold.ttf').text(
					text: i18next.t('translation:pdfTaxTotalWithTaxHeading'), // Celkom s DPH
				},
			],
		],
	})

	doc.font('resources/fonts/WorkSans-Medium.ttf')

	const ticketType = ticketsForPdf[0].ticketType

	const ticketsRowData = []
	if (numberOfAdults > 0) {
		ticketsRowData.push({
			ticketName: ticketsForPdf[0].ticketType.name,
			quantity: numberOfAdults,
			price: parseFloat(ticketType.priceWithoutTax.toFixed(2)),
			total:
				numberOfAdults *
				parseFloat(ticketType.priceWithoutTax.toFixed(2)),
			tax: i18next.t('translation:pdfTaxTaxPercentage'),
			totalWithTax:
				numberOfAdults * parseFloat(ticketType.priceWithTax.toFixed(2)),
		})
	}

	if (numberOfChildren > 0) {
		ticketsRowData.push({
			ticketName: getChildrenTicketName(),
			quantity: numberOfChildren,
			price: parseFloat(ticketType.childrenPriceWithoutTax.toFixed(2)),
			total:
				numberOfChildren *
				parseFloat(ticketType.childrenPriceWithoutTax.toFixed(2)),
			tax: i18next.t('translation:pdfTaxTaxPercentage'),
			totalWithTax:
				numberOfChildren *
				parseFloat(ticketType.childrenPriceWithTax.toFixed(2)),
		})
	}

	const ticketsRowDataFormatted = ticketsRowData.map((row) => {
		return [
			row.ticketName,
			{
				font: { size: fontSizeSmall },
				align: { x: 'right', y: 'top' },
				text: row.quantity + i18next.t('translation:pdfTaxQuantity'), // ks
			},
			{
				font: { size: fontSizeSmall },
				align: { x: 'right', y: 'top' },
				text: row.price,
			},
			{
				font: { size: fontSizeSmall },
				align: { x: 'right', y: 'top' },
				text: row.total,
			},
			{
				font: { size: fontSizeSmall },
				align: { x: 'right', y: 'top' },
				text: row.tax,
			},
			{
				font: { size: fontSizeSmall },
				align: { x: 'right', y: 'top' },
				text: row.totalWithTax,
			},
		]
	})

	doc.table({
		defaultStyle: { border: false },
		columnStyles: [200, '*', '*', '*', '*', '*'],
		rowStyles: {
			border: false,
			padding: { left: '1em', right: '1em' },
			backgroundColor: '#FFFFFF',
		},
		data: [
			...ticketsRowDataFormatted,
			[
				{
					font: { size: fontSizeSmall },
					text: discount
						? i18next.t('translation:pdfTaxDiscount') // Zlava
						: '',
				},
			],
		],
	})

	const orderPriceWithoutTax = ticketsForPdf.reduce(
		(acc, ticket) => acc + ticket.priceWithoutTax,
		0
	)
	const orderPriceTax = ticketsForPdf.reduce(
		(acc, ticket) => acc + ticket.priceTax,
		0
	)

	doc.table({
		defaultStyle: { border: [1, 1, 1, 1] },
		columnStyles: [200, '*', '*', '*'],
		rowStyles: {
			border: [1, 0, 0, 0],
			padding: { left: '1em', right: '1em' },
			backgroundColor: '#FFFFFF',
		},
		data: [
			[
				{
					align: { x: 'right', y: 'top' },
					font: { size: fontSizeSmall },
					text: '',
				},
				{
					align: { x: 'right', y: 'top' },
					font: { size: fontSizeSmall },
					text: i18next.t('translation:pdfTaxTotal'), // Spolu:
				},
				{
					align: { x: 'right', y: 'top' },
					font: { size: fontSizeSmall },
					text: '',
				},
				{
					align: { x: 'right', y: 'top' },
					font: { size: fontSizeSmall },
					text: `${orderPriceWithoutTax}`,
				},
				{
					align: { x: 'right', y: 'top' },
					font: { size: fontSizeSmall },
					text: `${orderPriceTax}`,
				},
				{
					align: { x: 'right', y: 'top' },
					font: { size: fontSizeSmall },
					text: 'kratucke',
				},
			],
		],
	})

	doc.moveDown()
	doc.moveDown()

	// rozkol
	// je dan orderPriceTax alebo orderPriceWithTax - orderPriceWithoutTax
	// horizontal line
	doc.table({
		rowStyles: {
			border: [1, 0, 0, 0],
			backgroundColor: '#FFFFFF',
		},
		data: [['']],
	})

	doc.table({
		defaultStyle: { border: false, width: 100 },
		rowStyles: {
			backgroundColor: '#FFFFFF',
			fontSize: fontSizeMedium,
		},
		data: [
			[
				[['']],
				[['']],
				[['']],
				i18next.t('translation:pdfTaxTotalWithoutTax'), // Celková suma bez DPH:
				{
					align: { x: 'right', y: 'top' },
					text: `${orderPriceWithoutTax} EUR`,
				},
			],
			[
				[['']],
				[['']],
				[['']],
				i18next.t('translation:pdfTaxTax'), // DPH:
				{
					align: { x: 'right', y: 'top' },
					text: `${orderPriceTax} EUR`,
				},
			],
			[
				[['']],
				[['']],
				[['']],
				i18next.t('translation:pdfTaxTotalWithTax'), // Celková suma s DPH:
				{
					align: { x: 'right', y: 'top' },
					text: `${orderPriceWithTax} EUR`,
				},
			],
			[
				[['']],
				[['']],
				[['']],
				i18next.t('translation:pdfTaxPaid'), // Uhradené:
				{
					align: { x: 'right', y: 'top' },
					text: `${orderPriceWithTax} EUR`,
				},
			],
		],
	})

	const thankYouPadding = 350

	doc.fontSize(fontSizeMedium)
		.font('resources/fonts/WorkSans-Bold.ttf')
		.text(i18next.t('translation:pdfTaxThankYou'), thankYouPadding) // ĎAKUJEME, UŽ UHRADENÉ

	doc.font('resources/fonts/WorkSans-Medium.ttf')

	doc.fontSize(fontSizeSmall).text(
		i18next.t('translation:pdfTaxNotTicket'), // neslúži ako vstupenka na letné kúpalisko
		thankYouPadding
	)

	doc.end()
	return await new Promise((resolve, reject) => {
		stream.on('data', (chunk) => (finalBase64String += chunk))
		stream.on('end', () => resolve(finalBase64String))
	})
}
