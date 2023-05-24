import { Template } from '@walletpass/pass-js'
import logger from '../utils/logger'

const template = new Template('eventTicket', {
	passTypeIdentifier: 'pass.sk.bratislava.kupaliska.v2',
	teamIdentifier: '2P6QC78LFR',
	backgroundColor: 'rgb(124, 206, 242)',
	organizationName: 'STARZ Bratislava',
	// this should suggest the ticket on users screen when they are near any of the swimming pools
	// TODO test this
	locations: [
		{
			latitude: 48.1499994,
			longitude: 17.1424423,
			relevantText: 'Delfín',
		},
	],
	maxDistance: 100,
	// sharingProhibited: true,
})

// all of these are async, should be ok not to wait on them when they happen on startup, we just need to watch for error logs
// logger.error(err) on new line mainly for development, where it doesn't print nicely if colocated with previous message

template
	.loadCertificate(
		'./resources/apple-wallet/pass.sk.bratislava.kupaliska.v2.pem',
		'$%nhw49T6t2!'
	)
	.catch((err) => {
		logger.error('Error Apple Wallet init! Problem loading certificate')
		logger.error(err)
	})

template.images
	.add('icon', './files/public/wallet-pass/logo.png')
	.catch((err) => {
		logger.error('Error Apple Wallet init! Problem loading icon')
		logger.error(err)
	})

template.images
	.add('logo', './files/public/wallet-pass/logo.png')
	.catch((err) => {
		logger.error('Error Apple Wallet init! Problem loading logo')
		logger.error(err)
	})

export const createPass = async (
	ticketId: string,
	ticketTypeName: string,
	ownerName?: string
) => {
	const pass = template.createPass({
		/**
		 * Brief description of the pass, used by the iOS accessibility technologies.
		 * Don’t try to include all of the data on the pass in its description,
		 * just include enough detail to distinguish passes of the same type.
		 */
		description: `Kúpaliská Bratislava ${ticketTypeName}${
			ownerName ? ` ${ownerName}` : ''
		}`,
		serialNumber: ticketId,
		expirationDate: '2023-09-31T10:00-05:00',
		eventTicket: {
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
					value: ticketTypeName,
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
							label: 'Držiteľ',
						},
				  ]
				: undefined,
			/**
			 * Additional fields to be displayed on the front of the pass.
			 */
			auxiliaryFields: [
				{
					key: 'instructions',
					value: 'Týmto QR kódom sa prosím preukážte pri vstupe.',
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
