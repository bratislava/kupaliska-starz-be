import each from 'jest-each';
import { joiCustomTimeRules, validBase64 } from '../../../src/utils/validation';
import Joi from 'joi'
const JoiExtended = Joi.extend(joiCustomTimeRules())

describe('Validation: BASE64 validation', () => {

	each([
		["base64,asdasadasdasd", false, "base64.invalid"],
		["data:file/jpeg;base64,asda", false, "base64.extensions"],
		["data:@file/jpeg;base64,asda", false, "base64.invalid"],
		["data:image/gif;base64,asda", false, "base64.extensions"],
		["data:image/php;base64,asda", false, "base64.extensions"],
		["data:image/php,asda", false, "base64.invalid"],
		["data:image/php;asda", false, "base64.invalid"],
		["data:image/jpeg;asda", false, "base64.invalid"],
		["data:image/png;asda", false, "base64.invalid"],
		["data:image/jpeg;base64,asda", true],
		["data:image/png;base64,asda", true],
	]).it('Should validate content', async (dataUri: string, expected: boolean, error = '') => {

		const helpers = {
			error: (errMessage: string) => {
				return errMessage
			}
		}

		const maxFileSize = 5 * 1024 * 1024
		const validExtensions = ['png', 'jpeg']
		const result = validBase64(maxFileSize, validExtensions)(dataUri, helpers)

		if (expected) {
			expect(result).toBe(dataUri)
		} else {
			expect(result).toBe(error)
		}
	});

});

describe('Validation : Joi custom time rule', () => {
	each([
		[ '15:15', '15:16', true],
		[ '23:58', '23:59', true],
		[ '00:00', '23:59', true],
		[ '14:15', '15:15', true],
		[ '15:15', '15:14', false],
		[ '15:15:', '15:20', false],
		[ '15:15:00', '15:20', false],
		[ '15:15:00', '15:20', false],
		[ '24:15', '15:20', false],
		[ '23:60', '15:20', false],
		[ '23:59', '23:58', false],
		[ '23:59', '23:59', false],
		[ 'a3:59', '23:59', false],
		[ '23:59', '23;59', false],
		[ '24:00', '00:00', false],
	]).it('Should validate schema', async (from: string, to: string, expected: boolean) => {

		const result = JoiExtended.object().keys({
			from: JoiExtended.time(),
			to: JoiExtended.time().minTime(JoiExtended.ref('from')),
		}).validate({ from, to })

		if (expected) {
			expect(result.error).toBe(undefined)
		} else {
			expect(result.error).toBeTruthy()
		}
	});
})



