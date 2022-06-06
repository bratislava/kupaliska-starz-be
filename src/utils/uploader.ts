import { Request } from 'express'
import fs from 'fs';
import path from 'path'
import util from 'util'
import config from 'config'
import { access, unlink, writeFile } from 'fs/promises';
import mime from 'mime-types'

import ErrorBuilder from './ErrorBuilder'
import logger from './logger'
import { IAppConfig } from '../types/interfaces'
import { captureError } from '../services/sentryService';
import { uploadFileToBucket } from './minio';

const appConfig: IAppConfig = config.get('app')

async function checkDestinationAccess(req: Request, directory: string) {
	const resultPath = path.join(appConfig.filesPath, directory)
	// check if path exists and if we have rights to write to it
	try {
		await access(resultPath, fs.constants.W_OK)
		return ''
	} catch (err) {
		if (err) {
			switch (err.code) {
				case 'ENOENT':
					// create filesystem errors log
					logger.error(`${403} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`)
					logger.error(`stack: ${JSON.stringify(util.inspect(err.stack))} \n`)
					captureError(err, req.ip, 'uploadInfo', { path: resultPath})
					throw new ErrorBuilder(403, req.t('error:uploadIncorrectSubdir'))
				case 'LIMIT_FILE_SIZE':
					// create filesystem errors log
					logger.error(`${418} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`)
					logger.error(`stack: ${JSON.stringify(util.inspect(err.stack))} \n`)
					captureError(err, req.ip, 'uploadInfo', { path: resultPath})
					throw new ErrorBuilder(418, req.t('error:uploadFileTooLarge'))
				default:
					throw err
			}
		}
		return resultPath
	}
}

function getFileName(filenamePrefix: string, ext: string) {
	// return hash name with extension as a new filename
	const extString = ext ? `.${ext}` : ''
	return `${filenamePrefix}-${Date.now()}${extString}`
}

function getFilePath(fileName: string, directory: string) {
	return path.join(appConfig.filesPath, directory, fileName)
}
function getRelativeFilePath(fileName: string, directory: string) {
	return path.join(directory, fileName)
}

export default async function uploadFileFromBase64(req: Request, fileBase64: string, directory: string) {


	var matches = fileBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/)
	if (!matches || matches.length !== 3) {
		throw new ErrorBuilder(400, req.t('error:invalidBase64'))
	}

	const mimeType = matches[1]
	const type = mime.extension(mimeType)
	if (type === false) {
		throw new ErrorBuilder(400, req.t('error:invalidBase64FileMimeType'))
	}

	const base64 = matches[2]

	await checkDestinationAccess(req, directory)
	const fileName = getFileName('file', type)
	const fullFilePath = getFilePath(fileName, directory)
	const relativeFilePath = getRelativeFilePath(fileName, directory)


	try {
		await writeFile(fullFilePath, base64, { encoding: 'base64' });
		await uploadFileToBucket(fullFilePath)
	} catch (err) {
		captureError(err, req.ip, 'uploadInfo', { path: fullFilePath})
		throw new ErrorBuilder(409, req.t('error:failedUpload'))
	}

	return {
		fileName: fileName,
		filePath: relativeFilePath,
		mimeType: mimeType,
		size: Buffer.byteLength(base64)
	}
}

export async function removeFile(fileName: string, directory: string) {
	// no-op - TODO check if we want or need this
	// const fullFilePath = getFilePath(fileName, directory)
	// await unlink(fullFilePath);
}
