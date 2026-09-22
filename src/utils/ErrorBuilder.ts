import Joi from 'joi'
import map from 'lodash/map'

// utils
import { MESSAGE_TYPE } from './enums'
import { REDACTED_FIELDS } from './constants'

interface IErrorBuilderItem {
	message: string
	type: string
	path?: string
}

const prepareErrorItems = (name: string | Joi.ValidationErrorItem[], key?: string) => {
	if (typeof name === 'string') {
		return [
			{
				type: MESSAGE_TYPE.ERROR,
				message: name,
				...(key && { path: key }),
			},
		]
	}

	return map(name, (item: Joi.ValidationErrorItem) => ({
		type: MESSAGE_TYPE.ERROR,
		path: item.path.join('.'),
		message: item.message,
	}))
}

export default class ErrorBuilder extends Error {
	status: number
	isJoi: boolean
	items: IErrorBuilderItem[]

	constructor(
		status: number,
		// TODO ErrorBuilder should consume Zod's error as well
		name: string | Joi.ValidationErrorItem[],
		key?: string
	) {
		let sensitiveDataStrippedName = name
		if (typeof sensitiveDataStrippedName !== 'string') {
			sensitiveDataStrippedName = sensitiveDataStrippedName.map((record) => {
				// fix when base64 value is too long
				// remove passwords from logs
				if (
					record.context &&
					(record.type.startsWith('base64.') ||
						REDACTED_FIELDS.some((field) => record.path.includes(field)))
				) {
					return { ...record, context: { ...record.context, value: '' } }
				}
				return record
			})
		}
		super(JSON.stringify(sensitiveDataStrippedName))
		this.status = status
		this.isJoi = typeof sensitiveDataStrippedName !== 'string'
		this.items = prepareErrorItems(sensitiveDataStrippedName, key)
	}
}
