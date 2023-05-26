import jwt from 'jsonwebtoken'

// the pass was created using this guide: https://codelabs.developers.google.com/add-to-wallet-web
// github repo of the guide: https://github.com/google-pay/wallet-web-codelab

// TODO remove credentials form git
const credentials = require('../../resources/google-pay/credentials.json')
// issuer ID can be found in Google Pay console - https://pay.google.com/business/console, use innovations gmail to log in
const issuerId = '3388000000022225089'
// this class was created using the tutorial mentioned above
const classId = `${issuerId}.sk.bratislava.kupaliska.v2`

export const getPassUrl = async (
	ticketId: string,
	ticketTypeName: string,
	ownerName?: string
) => {
	const objectId = `${issuerId}.${ticketId}`

	// TODO we can probably change the language to sk, but it might require tweaking the class as well - check in google pay console & test before trying in the wild
	// presently, no harm doen when this is presented as "en" and english being the only language in which the pass is available
	let genericObject = {
		id: objectId,
		classId: classId,
		genericType: 'GENERIC_TYPE_UNSPECIFIED',
		// TODO override here if multiple colors for different passes
		hexBackgroundColor: '#7CCEF2',
		logo: {
			sourceUri: {
				uri: 'https://storage.googleapis.com/wallet-lab-tools-codelab-artifacts-public/pass_google_logo.jpg',
				// TODO replace the logo with one with suitable format / dimensions - current one is not accepted
				// uri: 'https://api.kupaliska.bratislava.sk/public/wallet-pass/logo.png',
			},
		},
		cardTitle: {
			defaultValue: {
				language: 'en',
				value: ticketTypeName,
			},
		},
		// subheader can be emptu (TODO use if needed for disposable tickets - presently ownerName is always passed in)
		subheader: ownerName
			? {
					defaultValue: {
						language: 'en',
						value: 'Držiteľ',
					},
			  }
			: undefined,
		// header seeems to be mandatory - but the space is limited, the text must be short
		header: {
			defaultValue: {
				language: 'en',
				value:
					ownerName ||
					'Týmto QR kódom sa prosím preukážte pri vstupe.',
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
