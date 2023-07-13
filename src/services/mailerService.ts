import { captureError } from './sentryService'
import config from 'config'
import { IAppConfig, IMailgunserviceConfig } from '../types/interfaces'
import { Request } from 'express'

import mailgun, { Attachment, AttachmentParams } from 'mailgun-js'
import ErrorBuilder from '../utils/ErrorBuilder'
import i18next from 'i18next'
import path from 'path'
import logger from '../utils/logger'

const mailgunConfig: IMailgunserviceConfig = config.get('mailgunService')
const appConfig: IAppConfig = config.get('app')

const mailer = mailgun({
	host: mailgunConfig.host,
	apiKey: mailgunConfig.apiKey,
	domain: mailgunConfig.domain,
	retry: 2,
})

export const sendEmail = async (
	req: Request,
	recipient: string,
	subject: string,
	template: string,
	variables: Object,
	inlineAttachments?: Attachment[],
	attachments?: Attachment[]
): Promise<void> => {
	const mailData = {
		from: mailgunConfig.fromEmail,
		to: recipient,
		subject: subject,
		template: template,
		'h:X-Mailgun-Variables': JSON.stringify(variables),
		inline: [
			path.join(
				appConfig.filesPath,
				'public/email-attachments/ba-logo-white.png'
			),
			// path.join(appConfig.filesPath, 'public/email-attachments/eportal_ilustracia.png'),
			...(inlineAttachments || []),
		],
		attachment: attachments,
	}

	try {
		logger.info('SEND MAIL DATA', mailData)
		await mailer.messages().send(mailData)
	} catch (err) {
		logger.error(
			`${424} - EMAIL ERROR - ${err.message} - ${req.originalUrl} - ${
				req.method
			} - ${req.ip}`
		)
		captureError(err, req.ip, 'emailData', {
			from: mailData.from,
			to: recipient,
			variables,
			emailType: 'templateEmail',
		})
		throw new ErrorBuilder(424, i18next.t('error:emailFailed'))
	}
}

export const sendRawEmail = async (
	req: Request,
	recipient: string,
	subject: string,
	html: string
): Promise<void> => {
	const mailData = {
		from: mailgunConfig.fromEmail,
		to: recipient,
		subject: subject,
		html: html,
	}

	try {
		await mailer.messages().send(mailData)
	} catch (err) {
		logger.error(
			`${424} - EMAIL ERROR - ${err.message} - ${req.originalUrl} - ${
				req.method
			} - ${req.ip}`
		)
		captureError(err, req.ip, 'emailData', {
			from: mailData.from,
			to: recipient,
			emailType: 'rawEmail',
		})
		throw new ErrorBuilder(424, i18next.t('error:emailFailed'))
	}
}

export const createAttachment = (data: AttachmentParams): Attachment => {
	return new mailer.Attachment(data)
}
