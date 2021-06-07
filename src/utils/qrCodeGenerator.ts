import QRCode from 'qrcode'
import config from 'config'
import { IPassportConfig } from '../types/interfaces'
import { createJwt } from './authorization'

const passwordConfig: IPassportConfig = config.get('passport')

// eslint-disable-next-line
export const generateQrCode = async (data: string, exportType: 'datauri' | 'buffer', expiresInMs?: number): Promise<string | Buffer> => {

	const accessToken = await createJwt({
		tid: data,
		expiresIn: expiresInMs ? expiresInMs : undefined
	}, {
		audience: passwordConfig.jwt.qrCode.audience,
	})

	// ONLY FOR TESTING PURPOSE
	// console.log(accessToken.length)
	// console.log(await QRCode.toString(accessToken, { type: 'terminal', errorCorrectionLevel: 'H' }))

	if (exportType === 'datauri') {
		return await QRCode.toDataURL(accessToken, { errorCorrectionLevel: 'H' })
	}
	if (exportType === 'buffer') {
		return await QRCode.toBuffer(accessToken, { errorCorrectionLevel: 'H' })
	}
	return ''
}


