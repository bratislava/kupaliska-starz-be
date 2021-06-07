import Joi from 'joi'
import { map } from 'lodash'

// utils
import { MESSAGE_TYPE } from './enums'

interface IErrorBuilderItem {
	message: string,
	type: string,
	path?: string
}

const prepareErrorItems = (name: string | Joi.ValidationErrorItem[], key?: string) => {
	if (typeof name === 'string') {
		return [{
			type: MESSAGE_TYPE.ERROR,
			message: name,
			...key && ({path: key})
		}]
	}

	return map(name, (item: Joi.ValidationErrorItem) => ({
		type: MESSAGE_TYPE.ERROR,
		path: item.path.join('.'),
		message: item.message
	}))
}

export default class ErrorBuilder extends Error {
	status: number
	isJoi: boolean
	items: IErrorBuilderItem[]

	constructor(status: number, name: string | Joi.ValidationErrorItem[], key?: string) {
		// fix when base64 value is too long
		if (typeof(name) !== 'string') {
			name.forEach((record) => {
				if (record.context && record.type.startsWith('base64.')) {
					record.context.value = ''
				}
			})
		}
		super(JSON.stringify(name))
		this.status = status
		this.isJoi = typeof name !== 'string'
		this.items = prepareErrorItems(name, key)
	}
}
