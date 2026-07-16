import formurlencoded from 'form-urlencoded'
import fs from 'fs'
import config from 'config'
import Joi from 'joi'
import xml2js from 'xml2js'
import { models } from '../db/models'
import { PaymentResponseModel } from '../db/models/paymentResponse'
import { createSignature, verifySignature } from '../utils/webpay'
import {
	IAppConfig,
	IGPWebpayConfig,
	IGPWebpayHttpRequest,
	IGPWebpayHttpResponse,
} from '../types/interfaces'
import { OrderModel } from '../db/models/order'
import { PAYMENT_OPERATION, ORDER_PAYMENT_METHOD_STATE } from '../utils/enums'
import { logger } from '../utils/logger'
import ErrorBuilder from '../utils/ErrorBuilder'
import { httpErrorStatusString } from '../utils/helpers'

const appConfig: IAppConfig = config.get('app')
const webpayConfig: IGPWebpayConfig = config.get('gpWebpayService')

const gpPaymentServiceURL = `${webpayConfig.httpApi}/pay-ws/v1/PaymentService`

export const gpWebservicePaymentStatusErrorSchema = Joi.object({
	'soapenv:Envelope': Joi.object().keys({
		$: Joi.object().keys({
			'xmlns:soapenv': Joi.string(),
		}),
		'soapenv:Body': Joi.array()
			.required()
			.min(1)
			.items({
				'soapenv:Fault': Joi.array()
					.min(1)
					.required()
					.items({
						faultcode: Joi.array().required().items(Joi.string()),
						faultstring: Joi.array().required().items(Joi.string()),
						detail: Joi.array()
							.min(1)
							.required()
							.items({
								'ns4:serviceException': Joi.array()
									.min(1)
									.required()
									.items({
										$: Joi.object()
											.keys({
												'xmlns:ns4': Joi.string(),
												'xmlns:ns5': Joi.string(),
												'xmlns:ns3': Joi.string(),
												'xmlns:ns2': Joi.string(),
											})
											.unknown(true),
										'ns3:messageId': Joi.array().required().items(Joi.string()),
										'ns3:primaryReturnCode': Joi.array().required().items(Joi.string()),
										'ns3:secondaryReturnCode': Joi.array().required().items(Joi.string()),
										'ns3:signature': Joi.array().required().items(Joi.string()),
									}),
							}),
					}),
			}),
	}),
})

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
		logger.error(err)
		return false
	}
	return true
}

const createRequestSignatureString = (paymentObject: IGPWebpayHttpRequest): string => {
	// DO NOT CHANGE ORDER OF PARAMS
	let data: string
	data = `${paymentObject.MERCHANTNUMBER}|${paymentObject.OPERATION}|${paymentObject.ORDERNUMBER}|${paymentObject.AMOUNT}`
	data += paymentObject.CURRENCY ? `|${paymentObject.CURRENCY}` : ''
	data += paymentObject.DEPOSITFLAG ? `|${paymentObject.DEPOSITFLAG}` : ''
	data += paymentObject.URL ? `|${paymentObject.URL}` : ''
	data += paymentObject.PAYMETHOD ? `|${paymentObject.PAYMETHOD}` : ''
	data += paymentObject.USERPARAM1 ? `|${paymentObject.USERPARAM1}` : ''
	return data
}

const createRequestSignatureStringSimplified = (paramsToSign: (number | string)[]): string => {
	let data: string = ''
	paramsToSign.forEach((param, index) => {
		if (index !== 0) {
			data += '|'
		}
		data += param
	})
	return data
}

// In case of DIGEST1 verification use withMerchantNumber = true
const createResponseSignatureString = (
	responseObject: IGPWebpayHttpResponse,
	withMerchantNumber = false
): string => {
	// DO NOT CHANGE ORDER OF PARAMS
	let data: string
	data = `${responseObject.OPERATION}`
	data += `|${responseObject.ORDERNUMBER}`
	data += responseObject.MERORDERNUM ? `|${responseObject.MERORDERNUM}` : ''
	data += responseObject.MD ? `|${responseObject.MD}` : ''
	data += `|${responseObject.PRCODE}`
	data += `|${responseObject.SRCODE}`
	data += responseObject.RESULTTEXT ? `|${responseObject.RESULTTEXT}` : ''
	data += responseObject.USERPARAM1 ? `|${responseObject.USERPARAM1}` : ''
	data += responseObject.ADDINFO ? `|${responseObject.ADDINFO}` : ''
	data += responseObject.TOKEN ? `|${responseObject.TOKEN}` : ''
	data += responseObject.EXPIRY ? `|${responseObject.EXPIRY}` : ''
	data += responseObject.ACSRES ? `|${responseObject.ACSRES}` : ''
	data += responseObject.ACCODE ? `|${responseObject.ACCODE}` : ''
	data += responseObject.PANPATTERN ? `|${responseObject.PANPATTERN}` : ''
	data += responseObject.DAYTOCAPTURE ? `|${responseObject.DAYTOCAPTURE}` : ''
	data += responseObject.TOKENREGSTATUS ? `|${responseObject.TOKENREGSTATUS}` : ''
	data += responseObject.ACRC ? `|${responseObject.ACRC}` : ''
	data += responseObject.RRN ? `|${responseObject.RRN}` : ''
	data += responseObject.PAR ? `|${responseObject.PAR}` : ''
	data += responseObject.TRACEID ? `|${responseObject.TRACEID}` : ''
	data += withMerchantNumber ? `|${webpayConfig.merchantNumber}` : ''
	return data
}

const signData = async (paymentObject: IGPWebpayHttpRequest) => {
	const dataToSign = createRequestSignatureString(paymentObject)
	// const publicKey = await fs.promises.readFile(webpayConfig.publicKeyPath)
	const privateKey = await fs.promises.readFile(webpayConfig.privateKeyPath)
	return createSignature(dataToSign, privateKey, webpayConfig.privateKeyPassword)
	// self-verify signature
	// if (verifySignature(dataToSign, signature, publicKey) === false) {
	// 	throw new Error('Problem with verifying signature, check payment keys.')
	// }
}

export const signDataSimplified = async (arrayToSign: (number | string)[]) => {
	const dataToSign = createRequestSignatureStringSimplified(arrayToSign)
	const privateKey = await fs.promises.readFile(webpayConfig.privateKeyPath)
	return createSignature(dataToSign, privateKey, webpayConfig.privateKeyPassword)
}

const verifyData = async (paymentResponse: IGPWebpayHttpResponse) => {
	const data = createResponseSignatureString(paymentResponse)
	const dataWithMerchantNumber = createResponseSignatureString(paymentResponse, true)
	const publicKey = await fs.promises.readFile(webpayConfig.gpPublicKeyPath)
	return (
		verifySignature(data, paymentResponse.DIGEST, publicKey) &&
		verifySignature(dataWithMerchantNumber, paymentResponse.DIGEST1, publicKey)
	)
}

export const verifyDataGetPaymentStatusWebserviceResponse = async (
	arrayToSign: string[],
	signature: string
) => {
	const data = await signDataSimplified(arrayToSign)
	const publicKey = await fs.promises.readFile(webpayConfig.gpPublicKeyPath)
	return verifySignature(data, signature, publicKey)
}

const verifyPayment = (paymentResponse: IGPWebpayHttpResponse) =>
	// AK PRCODE && SRCODE === 0 => PLATBA PREBEHLA V PORIADKU
	parseInt(paymentResponse.PRCODE, 10) === 0 && parseInt(paymentResponse.SRCODE, 10) === 0

export const createPayment = async (
	order: OrderModel,
	orderPaymentMethod?: ORDER_PAYMENT_METHOD_STATE
) => {
	const { PaymentOrder } = models

	const paymentOrder = await PaymentOrder.create({
		paymentAmount: order.priceWithVat,
		orderId: order.id,
	})

	const paymentObject: IGPWebpayHttpRequest = {
		MERCHANTNUMBER: webpayConfig.merchantNumber,
		OPERATION: PAYMENT_OPERATION.CREATE_ORDER,
		ORDERNUMBER: order.orderNumber,
		AMOUNT: paymentOrder.paymentAmount, // in cents
		CURRENCY: Number(webpayConfig.currency), // num code based on ISO 4217
		DEPOSITFLAG: 1, // 1 - Require immediate payment | 0 - Do not require immediate payment
		URL: `${appConfig.host}/api/v1/orders/webpay/response`, // BE URL where will result be sent
		PAYMETHOD: orderPaymentMethod, // payment method
	}

	const signedObject: IGPWebpayHttpRequest = {
		...paymentObject,
		DIGEST: await signData(paymentObject),
	}

	return {
		url: `${webpayConfig.httpApi}/pgw/order.do`,
		formurlencoded: formurlencoded(signedObject, { ignorenull: true }),
	}
}

export const registerPaymentResult = async (
	paymentData: any,
	paymentOrderId: string,
	req: any
): Promise<PaymentResponseModel> => {
	const { PaymentResponse } = models

	const verificationResult = await verifyData(paymentData)
	const paymentResult = verifyPayment(paymentData)

	return await PaymentResponse.create({
		data: paymentData,
		isVerified: verificationResult,
		isSuccess: paymentResult,
		paymentOrderId: paymentOrderId,
	})
}

export const getPaymentStatusWebServiceRequest = async (orderNumber: number) => {
	const provider = webpayConfig.provider
	const merchantNumber = webpayConfig.merchantNumber

	const envVars = {
		provider,
		merchantNumber,
	}

	const now = new Date()

	// TODO add "orderNumber" to messageId so we can trace back to what order this requests belongs
	// now we are dependent on synchronicity of this process and when requesting then we
	// are await-ing for response that way it works for now
	const messageId = `${now.getTime()}${provider}${merchantNumber}getPaymentStatus`

	const requestObject = {
		messageId,
		...envVars,
	}
	// we need to encrypt values and process of signing is dependent on order of values
	// more info here https://www.gpwebpay.cz/downloads/GP_webpay_WS.pdf and here https://www.gpwebpay.cz/downloads/GP_webpay_Sprava_soukromeho_klice.pdf part 4.2.2.2.1
	const paramsToSign = [
		messageId,
		requestObject.provider,
		requestObject.merchantNumber,
		orderNumber,
	]
	const signature = await signDataSimplified(paramsToSign)

	const paymentStatusRequestObject = {
		...envVars,
		messageId,
		paymentNumber: orderNumber,
		signature,
	}
	const requestBody = `
		<soapenv:Envelope xmlns:soapenv='http://schemas.xmlsoap.org/soap/envelope/' xmlns:v1='http://gpe.cz/pay/pay-ws/proc/v1' xmlns:type='http://gpe.cz/pay/pay-ws/proc/v1/type'>
			<soapenv:Header/>
			<soapenv:Body>
				<v1:getPaymentStatus>
					<v1:paymentStatusRequest>
						<type:messageId>${paymentStatusRequestObject.messageId}</type:messageId>
						<type:provider>${paymentStatusRequestObject.provider}</type:provider>
						<type:merchantNumber>${paymentStatusRequestObject.merchantNumber}</type:merchantNumber>
						<type:paymentNumber>${paymentStatusRequestObject.paymentNumber}</type:paymentNumber>
						<type:signature>${paymentStatusRequestObject.signature}</type:signature>
					</v1:paymentStatusRequest>
				</v1:getPaymentStatus>
			</soapenv:Body>
		</soapenv:Envelope>
	`
		// string adjustment to keep formatting in code but send it as one line
		.replace(/>\s+</g, '><')
		.trim()
	const response = await fetch(gpPaymentServiceURL, {
		method: 'post',
		body: requestBody,
		headers: { 'Content-Type': 'text/xml' },
	})

	if (response.ok) {
		return response
	}
	const data = await response.text()

	// GP is returning for valid request (example is when sending request has OrderNumber that is not visited and therefore not yet consumed by GP),
	// response 500, we need to act as it is fine and return undefined.

	// TODO we should use axios
	if (response.status === 500) {
		try {
			const parser = new xml2js.Parser()
			const parsedBody = await parser.parseStringPromise(data)
			const { error: validateErrorSchemaError } =
				gpWebservicePaymentStatusErrorSchema.validate(parsedBody)

			// this is 500 from GP but request was possibly valid and response should not be 500
			if (!validateErrorSchemaError) {
				// all return codes can be found in https://portal.gpwebpay.com/portal/tools/GP_webpay_WS_API.pdf part 5.2
				logger.warn(`GP Response that shouldn't be 500 but it is: ${data}`)
				return undefined
			}
		} catch (error) {
			logger.warn(
				`Error occurred while parsing XML and validating paymentService from "${gpPaymentServiceURL}"`
			)
		}
	}
	logger.error(httpErrorStatusString(response))

	logger.error(`Error body: ${data}`)
	throw new ErrorBuilder(
		500,
		`Error occurred while fetching paymentService from "${gpPaymentServiceURL}"`
	)
}
