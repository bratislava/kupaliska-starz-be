import QRCode, { QRCodeToBufferOptions, QRCodeToDataURLOptions } from 'qrcode'

// Legacy code
// const passwordConfig: IPassportConfig = config.get('passport')
// ONLY FOR TESTING PURPOSE
// console.log(accessToken.length)
// console.log(await QRCode.toString(accessToken, { type: 'terminal', errorCorrectionLevel: 'H' }))

export const generateQrCodeBuffer = (
	data: string,
	options?: QRCodeToBufferOptions,
) =>
	QRCode.toBuffer(data, {
		errorCorrectionLevel: 'H',
		...(options ?? {}),
	})

export const generateQrCodeDataUrl = (
	data: string,
	options?: QRCodeToDataURLOptions,
) =>
	QRCode.toDataURL(data, {
		errorCorrectionLevel: 'H',
		...(options ?? {}),
	})
