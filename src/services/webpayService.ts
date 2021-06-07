import formurlencoded from 'form-urlencoded';
import fs from 'fs'
import config from 'config'
import { models } from '../db/models'
import { PaymentResponseModel } from '../db/models/paymentResponse'
import { createSignature, verifySignature } from '../utils/webpay'
import {
	IAppConfig,
	IGPWebpayConfig,
	IGPWebpayHttpRequest,
	IGPWebpayHttpResponse
} from '../types/interfaces'
import { Transaction } from 'sequelize'
import { OrderModel } from '../db/models/order'
import { PAYMENT_OPERATION } from '../utils/enums'

const appConfig: IAppConfig = config.get('app')
const webpayConfig: IGPWebpayConfig = config.get('gpWebpayService')

export const checkPaymentKeys = () => {
	try {
		// const publicKey = fs.readFileSync(webpayConfig.publicKeyPath)
		const privateKey = fs.readFileSync(webpayConfig.privateKeyPath)
		const gpPublicKey = fs.readFileSync(webpayConfig.gpPublicKeyPath)

		if (
			// publicKey.length === 0 ||
			privateKey.length === 0 ||
			gpPublicKey.length === 0
		) {
			throw new Error('Empty key files')
		}

		if (!webpayConfig.privateKeyPassword) {
			throw new Error('Empty private key password')
		}

		if (!webpayConfig.merchantNumber) {
			throw new Error('Empty merchant number')
		}

	} catch (err) {
		console.log(err)
		return false
	}
	return true
}

const createRequestSignatureString = (paymentObject: IGPWebpayHttpRequest): string => {
	// DO NOT CHANGE ORDER OF PARAMS
	let data: string
	data = `${paymentObject.MERCHANTNUMBER}|${paymentObject.OPERATION}|${paymentObject.ORDERNUMBER}|${paymentObject.AMOUNT}`
	data += (paymentObject.CURRENCY) ? `|${paymentObject.CURRENCY}` : ''
	data += (paymentObject.DEPOSITFLAG) ? `|${paymentObject.DEPOSITFLAG}` : ''
	data += (paymentObject.URL) ? `|${paymentObject.URL}` : ''
	data += (paymentObject.USERPARAM1) ? `|${paymentObject.USERPARAM1}` : ''
	return data
}

// In case of DIGEST1 verification use withMerchantNumber = true
const createResponseSignatureString = (responseObject: IGPWebpayHttpResponse, withMerchantNumber = false): string => {
	// DO NOT CHANGE ORDER OF PARAMS
	let data: string
	data = `${responseObject.OPERATION}`
	data += `|${responseObject.ORDERNUMBER}`
	data += (responseObject.MERORDERNUM) ? `|${responseObject.MERORDERNUM}` : ''
	data += (responseObject.MD) ? `|${responseObject.MD}` : ''
	data += `|${responseObject.PRCODE}`
	data += `|${responseObject.SRCODE}`
	data += (responseObject.RESULTTEXT) ? `|${responseObject.RESULTTEXT}` : ''
	data += (responseObject.USERPARAM1) ? `|${responseObject.USERPARAM1}` : ''
	data += (responseObject.ADDINFO) ? `|${responseObject.ADDINFO}` : ''
	data += (responseObject.TOKEN) ? `|${responseObject.TOKEN}` : ''
	data += (responseObject.EXPIRY) ? `|${responseObject.EXPIRY}` : ''
	data += (responseObject.ACSRES) ? `|${responseObject.ACSRES}` : ''
	data += (responseObject.ACCODE) ? `|${responseObject.ACCODE}` : ''
	data += (responseObject.PANPATTERN) ? `|${responseObject.PANPATTERN}` : ''
	data += (responseObject.DAYTOCAPTURE) ? `|${responseObject.DAYTOCAPTURE}` : ''
	data += (responseObject.TOKENREGSTATUS) ? `|${responseObject.TOKENREGSTATUS}` : ''
	data += (responseObject.ACRC) ? `|${responseObject.ACRC}` : ''
	data += (responseObject.RRN) ? `|${responseObject.RRN}` : ''
	data += (responseObject.PAR) ? `|${responseObject.PAR}` : ''
	data += (responseObject.TRACEID) ? `|${responseObject.TRACEID}` : ''
	data += (withMerchantNumber) ? `|${webpayConfig.merchantNumber}` : ''
	return data
}

const signData = async (paymentObject: IGPWebpayHttpRequest) => {
	const dataToSign = createRequestSignatureString(paymentObject)
	// const publicKey = await fs.promises.readFile(webpayConfig.publicKeyPath)
	const privateKey = await fs.promises.readFile(webpayConfig.privateKeyPath)
	return  createSignature(dataToSign, privateKey, webpayConfig.privateKeyPassword)
	// self-verify signature
	// if (verifySignature(dataToSign, signature, publicKey) === false) {
	// 	throw new Error('Problem with verifying signature, check payment keys.')
	// }
}

const verifyData = async (paymentResponse: IGPWebpayHttpResponse) => {
	const data = createResponseSignatureString(paymentResponse)
	const dataWithMerchantNumber = createResponseSignatureString(paymentResponse, true)
	const publicKey = await fs.promises.readFile(webpayConfig.gpPublicKeyPath)
	return (verifySignature(data, paymentResponse.DIGEST, publicKey)
		&& verifySignature(dataWithMerchantNumber, paymentResponse.DIGEST1, publicKey))
}

const verifyPayment = (paymentResponse: IGPWebpayHttpResponse) => 
	// AK PRCODE && SRCODE === 0 => PLATBA PREBEHLA V PORIADKU
	(parseInt(paymentResponse.PRCODE, 10) === 0 && parseInt(paymentResponse.SRCODE, 10) === 0)

export const createPayment = async (order: OrderModel, transaction: Transaction) => {
	const {
		PaymentOrder
	} = models

	const paymentOrder = await PaymentOrder.create({
		paymentAmount: order.price,
		orderId: order.id,
	}, { transaction })


	const paymentObject: IGPWebpayHttpRequest = {
		MERCHANTNUMBER: webpayConfig.merchantNumber,
		OPERATION: PAYMENT_OPERATION.CREATE_ORDER,
		ORDERNUMBER: order.orderNumber,
		AMOUNT: Math.round(paymentOrder.paymentAmount * 100), // in cents
		CURRENCY: Number(webpayConfig.currency), // num code based on ISO 4217
		DEPOSITFLAG: 1, // 1 - Require immediate payment | 0 - Do not require immediate payment
		URL: `${appConfig.host}/api/v1/orders/webpay/response`, // BE URL where will result be sent
	}

	const signedObject: IGPWebpayHttpRequest = {
		...paymentObject,
		DIGEST: await signData(paymentObject)
	}

	return {
		url: webpayConfig.httpApi,
		data: signedObject,
		dataToSign: createRequestSignatureString(paymentObject),
		formurlencoded: formurlencoded(signedObject, { ignorenull: true })
	}
}

export const registerPaymentResult = async (paymentData: any, paymentOrderId: string, req: any): Promise<PaymentResponseModel> => {
	const {
		PaymentResponse
	} = models

	const verificationResult = await verifyData(paymentData)
	const paymentResult = verifyPayment(paymentData)

	return await PaymentResponse.create({
		data: paymentData,
		isVerified: verificationResult,
		isSuccess: paymentResult,
		paymentOrderId: paymentOrderId
	})

}
