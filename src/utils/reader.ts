import { FileModel } from './../db/models/file';
import path from 'path'
import config from 'config'
import { readFile} from 'fs/promises';

import ErrorBuilder from './ErrorBuilder'
import { IAppConfig } from '../types/interfaces'
import i18next from 'i18next';

const appConfig: IAppConfig = config.get('app')

function getFilePath(filePath: string) {
	return path.join(appConfig.filesPath, filePath)
}

export default async function readAsBase64(file: FileModel) {
	const fullFilePath = getFilePath(file.originalPath)

	let base64File
	try {
		base64File = await readFile(fullFilePath, { encoding: 'base64' });
	} catch (err) {
		throw new ErrorBuilder(409, i18next.t('error:failedRead'))
	}
	return `data:${file.mimeType};base64,${base64File}`
}
