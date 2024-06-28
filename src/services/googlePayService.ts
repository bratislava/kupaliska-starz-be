import jwt from 'jsonwebtoken'
// TODO remove credentials form git
import credentials from '../../resources/google-pay/credentials.json'
import { textColorsMap } from '../utils/enums'
import { TicketModel } from '../db/models/ticket'
import {
	getWalletPassTicketDescription,
	getWalletPassTicketName,
} from '../utils/helpers'

// the pass was created using this guide: https://codelabs.developers.google.com/add-to-wallet-web
// github repo of the guide: https://github.com/google-pay/wallet-web-codelab

// issuer ID can be found in Google Pay console - https://pay.google.com/business/console, use innovations gmail to log in
const issuerId = '3388000000022225089'
// this class was created using the tutorial mentioned above
const classId = `${issuerId}.sk.bratislava.kupaliska.v2`

export const getPassUrl = async (ticket: TicketModel) => {
	const objectId = `${issuerId}.${ticket.id}`
	const ticketName = getWalletPassTicketName(ticket)
	const ticketDescription = getWalletPassTicketDescription(ticket)
	const ownerName = ticket.ticketType.isDisposable
		? undefined
		: ticket.profile.name

	// TODO we can probably change the language to sk, but it might require tweaking the class as well - check in google pay console & test before trying in the wild
	// presently, no harm doen when this is presented as "en" and english being the only language in which the pass is available
	let genericObject = {
		id: objectId,
		classId: classId,
		genericType: 'GENERIC_TYPE_UNSPECIFIED',
		hexBackgroundColor: textColorsMap[ticket.getCategory()].background,
		// TODO replace the logo after first deploy
		logo: {
			sourceUri: {
				uri: 'https://api-kupaliska.bratislava.sk/public/wallet-pass/logo-starz.png',
			},
		},
		cardTitle: {
			defaultValue: {
				language: 'en',
				value: ownerName ? ticketName : 'Kúpaliská Bratislava',
			},
		},
		// subheader can be empty
		subheader: ticketDescription
			? {
					defaultValue: {
						language: 'en',
						value: ticketDescription,
					},
			  }
			: null,
		// header seems to be mandatory - but the space is limited, the text must be short
		header: ownerName
			? {
					defaultValue: {
						language: 'en',
						value: ownerName,
					},
			  }
			: {
					defaultValue: {
						language: 'en',
						value: ticketName,
					},
			  },

		barcode: {
			type: 'QR_CODE',
			value: ticket.id,
		},
	}

	const claims = {
		iss: credentials.client_email,
		aud: 'google',
		origins: [] as any,
		typ: 'savetowallet',
		payload: {
			genericObjects: [genericObject],
		},
	}

	const token = jwt.sign(claims, credentials.private_key, {
		algorithm: 'RS256',
	})
	return `https://pay.google.com/gp/v/save/${token}`
}
