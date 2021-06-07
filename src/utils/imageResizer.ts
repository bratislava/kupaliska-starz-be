import path from 'path'
import config from 'config'
import { IAppConfig } from '../types/interfaces'

const appConfig: IAppConfig = config.get('app')

// eslint-disable-next-line
export const normalizeFilePath = (filePath: string) => {
	let newFilePath = filePath
	const indexOfFilePath = newFilePath.indexOf(appConfig.filesPath)
	if (indexOfFilePath === 0) {
		// remove fileBase path from the begining and set / as URL separator
		newFilePath = newFilePath.slice(appConfig.filesPath.length, newFilePath.length).split(path.sep).join('/')
	}
	return newFilePath
}

export const getResizedImagePath = (filePath: string, suffix: string) => {
	const filePathSplit = filePath.split('/')
	const originalNameSplit = filePathSplit[filePathSplit.length - 1].split('.')
	const extension = originalNameSplit[originalNameSplit.length - 1]
	const originalName = originalNameSplit.slice(0, originalNameSplit.length - 1).join('.')
	const fileName = `${originalName}-${suffix}.${extension}`
	return `${filePathSplit.slice(0, filePathSplit.length - 1).join('/')}/${fileName}`
}

export const isResizableImage = (mimeType: string) => {
	switch (mimeType) {
		case 'image/jpg':
		case 'image/jpeg':
		case 'image/png':
			return true
		default:
			return false
	}
}
