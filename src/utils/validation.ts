
import { Schema } from 'joi'
import ErrorBuilder from './ErrorBuilder'
import validator from 'validator';
import mime from 'mime-types'
import sanitizeHtml from 'sanitize-html';

const options = {
	abortEarly: false
}

export const validate = (condition: boolean, obj: any, schema: Schema, message?: string, key?: string) => {
	if (!schema) {
		throw new Error('Validation schema is not provided')
	}

	if (condition) {
		const result = schema.validate(obj, options)
		if (result.error) {
			throw new ErrorBuilder(400, message || result.error.details, key)
		}
	}
}

export const validBase64 = (maxFileSize: number, validExtensions: string[]) => (value: any, helpers: any) => {

	// validate data uri
	if (validator.isDataURI(value) === false) {
		return helpers.error('base64.invalid');
	}

	var matches = value.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/)
	if (!matches || matches.length !== 3) {
		return helpers.error('base64.invalid');
	}
	const mimeType = matches[1]
	const data = matches[2]

	// validate extension
	const type = mime.extension(mimeType)
	if (type === false || validExtensions.includes(type) === false) {
		return helpers.error('base64.extensions');
	}

	// validate base64
	if (data === '' || validator.isBase64(data) === false) {
		return helpers.error('base64.invalid');
	}

	// validate size
	const size = Buffer.byteLength(data, 'base64')
	if (size > maxFileSize) {
		return helpers.error('base64.size');
	}

	// Return the value unchanged
	return value;
};

export const joiCustomTimeRules = () => (joi: any) => {
	return {
		type: 'time',
		base: joi.string().regex(/^([0-2][0-9]):([0-5][0-9])$/),
		messages: {
			'time.minTime': '{{#label}} must be greather than {{#q}}'
		},
		rules: {
			minTime: {
				method(q: any) {

					return this.$_addRule({ name: 'minTime', args: { q } });
				},
				args: [
					{
						name: 'q',
						ref: true,
						assert: (value: string) => typeof value === 'string',
						message: 'must be a string'
					}
				],
				validate(value: string, helpers: any, args: any, _: any) {

					if (Number(value.substr(0, 2)) > 23 ) {
						return helpers.error('time');
					}

					if (args.q.localeCompare(value) !== -1) {
						return helpers.error('time.minTime', { q: args.q });
					}

					return value
				}
			},
		}
	};
};

export const joiCustomSanitizeRules = () => (joi: any) => {
	return {
		type: 'string',
		base: joi.string(),
		rules: {
			htmlStrip: {
				validate(value: string) {

					return sanitizeHtml(value, {
                        allowedTags: [],
                        allowedAttributes: {},
                    });
				}
			},
		}
	};
};
