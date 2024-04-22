import { captureError } from './sentryService'
import config from 'config'
import { IMailgunserviceConfig } from '../types/interfaces'
import { Request } from 'express'
import FormData from 'form-data'

import Mailgun, { CustomFile } from 'mailgun.js'
import ErrorBuilder from '../utils/ErrorBuilder'
import i18next from 'i18next'
import path from 'path'
import logger from '../utils/logger'

const mailgunConfig: IMailgunserviceConfig = config.get('mailgunService')

const mailgun = new Mailgun(FormData)
const mg = mailgun.client({
	username: 'api',
	key: mailgunConfig.apiKey,
	url: mailgunConfig.host,
})

export const sendEmail = async (
	req: Request,
	recipient: string,
	subject: string,
	template: string,
	variables: Object,
	inlineAttachments?: CustomFile[],
	attachments?: CustomFile[]
): Promise<void> => {
	const mailData = {
		from: mailgunConfig.fromEmail,
		to: recipient,
		subject: subject,
		template: template,
		'h:X-Mailgun-Variables': JSON.stringify(variables),
		inline: [...(inlineAttachments || [])],
		encoding: 'multipart/form-data',
		attachment: attachments,
	}

	try {
		logger.info('SEND MAIL DATA', JSON.stringify(mailData))
		await mg.messages.create(mailgunConfig.domain, mailData)
	} catch (err) {
		logger.error(err)
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
		await mg.messages.create(mailgunConfig.domain, mailData)
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
