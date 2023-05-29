import jwt from 'jsonwebtoken'
// TODO remove credentials form git
import credentials from '../../resources/google-pay/credentials.json'
import { TICKET_CATEGORY, textColorsMap } from '../utils/enums'

// the pass was created using this guide: https://codelabs.developers.google.com/add-to-wallet-web
// github repo of the guide: https://github.com/google-pay/wallet-web-codelab

// issuer ID can be found in Google Pay console - https://pay.google.com/business/console, use innovations gmail to log in
const issuerId = '3388000000022225089'
// this class was created using the tutorial mentioned above
const classId = `${issuerId}.sk.bratislava.kupaliska.v2`

export const getPassUrl = async (
	ticketId: string,
	ticketTypeName: string,
	ticketCategory: TICKET_CATEGORY,
	ownerName?: string
) => {
	const objectId = `${issuerId}.${ticketId}`

	// TODO we can probably change the language to sk, but it might require tweaking the class as well - check in google pay console & test before trying in the wild
	// presently, no harm doen when this is presented as "en" and english being the only language in which the pass is available
	let genericObject = {
		id: objectId,
		classId: classId,
		genericType: 'GENERIC_TYPE_UNSPECIFIED',
		// can't choose foreground/text color, hopefully reasonable color is inferred on google's side
		hexBackgroundColor: textColorsMap[ticketCategory].background,
		// logo: {
		// 	sourceUri: {
		// 		uri: 'https://storage.googleapis.com/wallet-lab-tools-codelab-artifacts-public/pass_google_logo.jpg',
		// 		// TODO replace the logo with one with suitable format / dimensions - current one is not accepted
		// 		// uri: 'https://api.kupaliska.bratislava.sk/public/wallet-pass/logo.png',
		// 	},
		// },
		cardTitle: {
			defaultValue: {
				language: 'en',
				value: 'Kúpaliská Bratislava',
			},
		},
		// subheader can be empty
		subheader: ownerName
			? {
					defaultValue: {
						language: 'en',
						value: ticketTypeName,
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
						value: ticketTypeName,
					},
			  },
		barcode: {
			type: 'QR_CODE',
			value: ticketId,
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
