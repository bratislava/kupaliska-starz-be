// env is already loaded by `node -r dotenv/config`, prevent `config/default` from
// reloading it, otherwise removed env variables would be restored from `.env` file
jest.mock('dotenv/config', () => ({}))

const setPepperCurrentId = (pepperCurrentId: string | undefined) => {
	if (pepperCurrentId === undefined) {
		delete process.env.PASSWORD_PEPPER_CURRENT_ID
	} else {
		process.env.PASSWORD_PEPPER_CURRENT_ID = pepperCurrentId
	}
}

// evaluate `config/default` from scratch with given `PASSWORD_PEPPER_CURRENT_ID`
const loadCurrentPepperId = (pepperCurrentId: string | undefined) => {
	setPepperCurrentId(pepperCurrentId)

	let defaultConfig: typeof import('../../../config/default')
	jest.isolateModules(() => {
		defaultConfig = require('../../../config/default')
	})
	return defaultConfig!.passwordHashing.currentPepperId
}

// evaluate `config/default` from scratch with additional `PASSWORD_PEPPER_<id>` env variables,
// original env variables are restored afterwards
const loadPeppers = (env: Record<string, string>) => {
	const originalEnv = process.env

	process.env = { ...originalEnv, ...env }
	try {
		let defaultConfig: typeof import('../../../config/default')
		jest.isolateModules(() => {
			defaultConfig = require('../../../config/default')
		})
		return defaultConfig!.passwordHashing.peppers
	} finally {
		process.env = originalEnv
	}
}

describe('PASSWORD_PEPPER_CURRENT_ID', () => {
	const originalPepperCurrentId = process.env.PASSWORD_PEPPER_CURRENT_ID

	afterEach(() => {
		setPepperCurrentId(originalPepperCurrentId)
	})

	describe('config/default passwordHashing.currentPepperId', () => {
		it.each([
			['0', 0],
			['1', 1],
			['42', 42],
		])('Should parse valid id "%s" without throwing', (value, expected) => {
			expect(loadCurrentPepperId(value)).toBe(expected)
		})

		it('Should throw when env variable is missing', () => {
			expect(() => loadCurrentPepperId(undefined)).toThrow('expected string, received undefined')
		})

		it.each(['abc', '1a', 'NaN', 'one'])(
			'Should throw when value "%s" is not a number',
			(value) => {
				expect(() => loadCurrentPepperId(value)).toThrow('must be a non-negative integer')
			}
		)

		// values which `Number()` silently accepts, but are not valid
		// `PASSWORD_PEPPER_CURRENT_ID` ids (non-negative integers without formatting)
		it.each(['00', '01', '', ' ', '1.5', '-1', ' 1 ', '1e1', '0x1', 'Infinity'])(
			'Should throw when value "%s" is not a valid pepper id',
			(value) => {
				expect(() => loadCurrentPepperId(value)).toThrow('must be a non-negative integer')
			}
		)
	})

	describe('config/default passwordHashing.peppers', () => {
		it.each([
			['0', 0],
			['1', 1],
			['42', 42],
			['1000', 1000],
		])('Should include pepper with valid id "%s"', (id, expected) => {
			const peppers = loadPeppers({ [`PASSWORD_PEPPER_${id}`]: 'test-pepper' })
			expect(peppers).toContainEqual({ id: expected, pepper: Buffer.from('test-pepper') })
		})

		// same values which are rejected for `PASSWORD_PEPPER_CURRENT_ID`
		it.each(['00', '01', '1.5', '-1', '1e1', '0x1', 'Infinity', 'abc', 'NaN', ' 1 ', ''])(
			'Should ignore pepper with invalid id "%s"',
			(id) => {
				const expected = loadPeppers({})
				expect(loadPeppers({ [`PASSWORD_PEPPER_${id}`]: 'test-pepper' })).toEqual(expected)
			}
		)

		it('Should ignore pepper with empty value', () => {
			const peppers = loadPeppers({ PASSWORD_PEPPER_1000: '' })
			expect(peppers.map(({ id }) => id)).not.toContain(1000)
		})
	})
})
