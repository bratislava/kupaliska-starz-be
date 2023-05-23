import QRCode from 'qrcode'
import config from 'config'
import { IPassportConfig } from '../types/interfaces'
import { createJwt } from './authorization'

const passwordConfig: IPassportConfig = config.get('passport')

// eslint-disable-next-line
export const generateQrCode = async (
	data: string,
	exportType: 'datauri' | 'buffer'
): Promise<string | Buffer> => {
	// ONLY FOR TESTING PURPOSE
	// console.log(accessToken.length)
	// console.log(await QRCode.toString(accessToken, { type: 'terminal', errorCorrectionLevel: 'H' }))

	if (exportType === 'datauri') {
		return await QRCode.toDataURL(data, {
			errorCorrectionLevel: 'H',
		})
	}
	if (exportType === 'buffer') {
		return await QRCode.toBuffer(data, { errorCorrectionLevel: 'H' })
	}
	return ''
}
