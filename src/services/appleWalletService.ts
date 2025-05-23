import { Template } from '@walletpass/pass-js'
import logger from '../utils/logger'
import { TICKET_CATEGORY, textColorsMap } from '../utils/enums'
import {
	getWalletPassTicketDescription,
	getWalletPassTicketName,
	hexToRgbString,
} from '../utils/helpers'
import { TicketModel } from '../db/models/ticket'
import config from 'config'
import { IAppleWalletConfig } from '../types/interfaces'

const appleWalletConfig: IAppleWalletConfig = config.get('appleWallet')

const template = new Template('generic', {
	passTypeIdentifier: 'pass.sk.bratislava.kupaliska.v5',
	teamIdentifier: '2P6QC78LFR',
	organizationName: 'STARZ Bratislava',
	backgroundColor: hexToRgbString(
		textColorsMap[TICKET_CATEGORY.SENIOR_OR_DISABLED].background
	),
	// this should suggest the ticket on users screen when they are near any of the swimming pools
	// TODO test locations
	locations: [
		{
			latitude: 48.1878005969888,
			longitude: 17.1857867249402,
			relevantText: 'Areál zdravia Zlaté piesky',
		},
		{
			latitude: 48.172792,
			longitude: 17.051565,
			relevantText: 'Kúpalisko Rosnička',
		},
		{
			latitude: 48.18726,
			longitude: 17.05017,
			relevantText: 'Kúpalisko Lamač',
		},
		{
			latitude: 48.160879,
			longitude: 17.135568,
			relevantText: 'Kúpalisko Tehelné pole',
		},
		{
			latitude: 48.149768,
			longitude: 17.141951,
			relevantText: 'Kúpalisko Delfín',
		},
		{
			latitude: 48.201787,
			longitude: 17.14532,
			relevantText: 'Kúpalisko Krasňany',
		},
		{
			latitude: 48.213609687683,
			longitude: 17.146377606091,
			relevantText: 'Kúpalisko Rača',
		},
		{
			latitude: 48.152962,
			longitude: 17.093707,
			relevantText: 'Kúpalisko Mičurín',
		},
	],
	maxDistance: 50,
})

// all of these are async, should be ok not to wait on them when they happen on startup, we just need to watch for error logs
// logger.error(err) on new line mainly for development, where it doesn't print nicely if colocated with previous message

template
	.loadCertificate(
		'./resources/apple-wallet/apple-wallet-cert.pem',
		appleWalletConfig.certificatePassword
	)
	.catch((err) => {
		logger.error('Error Apple Wallet init! Problem loading certificate')
		logger.error(err)
	})

template.images
	.add('icon', './files/public/wallet-pass/logo-starz-small.png')
	.catch((err) => {
		logger.error('Error Apple Wallet init! Problem loading icon')
		logger.error(err)
	})

template.images
	.add('logo', './files/public/wallet-pass/logo-starz-small.png')
	.catch((err) => {
		logger.error('Error Apple Wallet init! Problem loading logo')
		logger.error(err)
	})

export const createPass = async (ticket: TicketModel) => {
	const ticketId = ticket.id
	const ticketName = getWalletPassTicketName(ticket)
	const ticketDescription = getWalletPassTicketDescription(ticket)
	const ownerName = ticket.ticketType.isDisposable
		? undefined
		: ticket.profile.name
	const year = new Date().getFullYear()

	const pass = template.createPass({
		backgroundColor: hexToRgbString(
			textColorsMap[ticket.getCategory()].background
		),
		foregroundColor: hexToRgbString(
			textColorsMap[ticket.getCategory()].text
		),
		/**
		 * Brief description of the pass, used by the iOS accessibility technologies.
		 * Don’t try to include all of the data on the pass in its description,
		 * just include enough detail to distinguish passes of the same type.
		 */
		description: `Kúpaliská Bratislava ${ticketName}${
			ownerName ? ` ${ownerName}` : ''
		}`,
		serialNumber: ticketId,
		// this could be included in general info at start of the season
		expirationDate: `${year}-09-31T10:00-05:00`,
		generic: {
			headerFields: [
				{
					key: 'title',
					value: 'Kúpaliská Bratislava',
					textAlignment: 'PKTextAlignmentLeft',
				},
			],
			primaryFields: [
				{
					key: 'type',
					value: ticketName,
				},
			],
			/**
			 * Fields to be displayed on the front of the pass.
			 */
			secondaryFields: ownerName
				? [
						{
							key: 'owner',
							value: ownerName,
						},
				  ]
				: undefined,
			/**
			 * Additional fields to be displayed on the front of the pass.
			 */
			auxiliaryFields: [
				{
					key: 'instructions',
					value: ticketDescription,
				},
			],
		},
		barcodes: [
			{
				format: 'PKBarcodeFormatQR',
				message: ticketId,
				messageEncoding: 'iso-8859-1',
			},
		],
	})

	return await pass.asBuffer()
}
