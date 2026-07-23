import { FileModel } from './../db/models/file'
import { Stream } from 'node:stream'
import path from 'path'
import config from 'config'
import i18next from 'i18next'

import { IAppConfig } from '../types/interfaces'
import { downloadFileFromBucket } from './minio'
import ErrorBuilder from './ErrorBuilder'
import logger from './logger'

const appConfig: IAppConfig = config.get('app')

const stream2buffer = (stream: Stream): Promise<Buffer> => {
	return new Promise<Buffer>((resolve, reject) => {
		const _buf = new Array<any>()

		stream.on('data', (chunk) => _buf.push(chunk))
		stream.on('end', () => {
			resolve(Buffer.concat(_buf))
		})

		stream.on('error', (err) => {
			reject(new Error(`error converting stream - ${err}`))
		})
	})
}

function getFilePath(filePath: string) {
	return path.join(appConfig.filesPath, filePath)
}

export default async function readAsBase64(file: FileModel) {
	const fullFilePath = getFilePath(file.originalPath)

	let fileBase64
	try {
		const fileStream = await downloadFileFromBucket(fullFilePath)
		const fileBuffer = await stream2buffer(fileStream)
		fileBase64 = fileBuffer.toString('base64')
	} catch (error) {
		if (error instanceof Error) {
			logger.error(error.message)
		} else {
			logger.error(`readAsBase64 is throwing non Error: ${String(error)}`)
		}
		throw new ErrorBuilder(409, i18next.t('error:failedRead'))
	}

	return `data:${file.mimeType};base64,${fileBase64}`
}
