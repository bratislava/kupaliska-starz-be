import formurlencoded from 'form-urlencoded'
import fs from 'fs'
import config from 'config'
import { z } from 'zod'
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

interface GpWebpayProcessingStrategy {
	shouldAlert: boolean
}

const gpStringArray = z.array(z.string())

const gpWebservicePaymentStatusResponseSchema = z.object({
	'ns3:messageId': gpStringArray,
	'ns3:state': gpStringArray,
	'ns3:status': z.array(z.string()).min(1),
	'ns3:subStatus': gpStringArray,
	'ns3:signature': gpStringArray,
})

const gpGetPaymentStatusResponseSchema = z.object({
	$: z.looseObject({
		'xmlns:ns4': z.string(),
		xmlns: z.string(),
		'xmlns:ns5': z.string(),
		'xmlns:ns3': z.string(),
		'xmlns:ns2': z.string(),
	}),
	'ns4:paymentStatusResponse': z.array(gpWebservicePaymentStatusResponseSchema).min(1),
})

const gpWebservicePaymentStatusSchema = z.object({
	'soapenv:Envelope': z.object({
		$: z
			.looseObject({
				'xmlns:soapenv': z.string(),
			})
			.optional(),
		'soapenv:Body': z
			.array(
				z.object({
					'ns4:getPaymentStatusResponse': z.array(gpGetPaymentStatusResponseSchema).min(1),
				})
			)
			.min(1),
	}),
})

const gpServiceExceptionSchema = z.object({
	$: z.looseObject({
		'xmlns:ns4': z.string(),
		'xmlns:ns5': z.string(),
		'xmlns:ns2': z.string(),
		'xmlns:ns3': z.string(),
	}),
	'ns3:messageId': gpStringArray,
	'ns3:primaryReturnCode': gpStringArray,
	'ns3:secondaryReturnCode': gpStringArray,
	'ns3:signature': gpStringArray,
})

const gpFaultSchema = z.object({
	faultcode: gpStringArray,
	faultstring: gpStringArray,
	detail: z
		.array(
			z.object({
				'ns4:serviceException': z.array(gpServiceExceptionSchema).min(1),
			})
		)
		.min(1),
})

// xml2js wraps every element in an array and puts XML attributes under `$`.
export const gpWebservicePaymentStatusErrorSchema = z.object({
	'soapenv:Envelope': z.object({
		$: z
			.looseObject({
				'xmlns:soapenv': z.string(),
			})
			.optional(),
		'soapenv:Body': z
			.array(
				z.object({
					'soapenv:Fault': z.array(gpFaultSchema).min(1),
				})
			)
			.min(1),
	}),
})

const appConfig: IAppConfig = config.get('app')
const webpayConfig: IGPWebpayConfig = config.get('gpWebpayService')

const gpPaymentServiceURL = `${webpayConfig.httpApi}/pay-ws/v1/PaymentService`

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

	const messageId = `${orderNumber}${now.getTime()}${provider}${merchantNumber}getPaymentStatus`

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
	const data = await response.text()

	try {
		const parser = new xml2js.Parser()
		const parsedBody = await parser.parseStringPromise(data)

		if (response.ok) {
			const parsed = gpWebservicePaymentStatusSchema.safeParse(parsedBody)
			if (!parsed.success) {
				logger.info(`Error validating GP response: ${parsed.error}`)
			}
			return parsed.data
		}

		// GP returns HTTP 500 for some valid requests — e.g. when the OrderNumber
		// hasn't been visited at GP site yet from user so GP doesn't know it.
		// This isn't a real error coming from bad request,
		// so we treat it regular 200 response process this response
		// and in this case return undefined.

		// TODO we should use axios
		if (response.status === 500) {
			const parsed = gpWebservicePaymentStatusErrorSchema.safeParse(parsedBody)
			if (!parsed.success) {
				logger.warn(`Error while parsing GP response: ${parsed.error}`)
			} else {
				logger.warn(`GP Response that shouldn't be 500 but it is: ${JSON.stringify(parsed.data)}`)
				const serviceException =
					parsed.data['soapenv:Envelope']['soapenv:Body'][0]['soapenv:Fault'][0]['detail'][0][
						'ns4:serviceException'
					][0]
				const prCode = serviceException['ns3:primaryReturnCode'][0]
				const process = getProcessingStrategy(prCode)
				if (!process.shouldAlert) {
					logger.warn(`GP response handled PR code: ${prCode}`)
					return undefined
				}
				logger.warn(`GP response error, unhandled PR code: ${prCode}`)
			}
		}
	} catch (error) {
		logger.warn(`Error occurred while parsing XML and validating: ${error}`)
	}
	logger.error(httpErrorStatusString(response))

	logger.error(`Error body: ${data}`)
	throw new ErrorBuilder(
		500,
		`Error occurred while fetching paymentService from "${gpPaymentServiceURL}"`
	)
}

// inspired by https://github.com/bratislava/konto.bratislava.sk/blob/6da01b27184da17dede4146eba6c9142ffd7c96b/nest-tax-backend/src/payment/payment.service.ts#L363
export const getProcessingStrategy = (prCode: string): GpWebpayProcessingStrategy => {
	const pr = Number(prCode)

	// TODO handle other cases
	// https://www.gpwebpay.cz/downloads/GP_webpay_HTTP_EN.pdf

	// PR 15: Object not found
	if (pr === 15) {
		return {
			shouldAlert: false,
		}
	}
	return {
		shouldAlert: true,
	}
}
