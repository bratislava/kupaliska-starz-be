import bcrypt from 'bcryptjs'
import {
	comparePassword,
	comparePasswordBcrypt,
	comparePasswordPreviousPepper,
	createJwt,
	hashPassword,
	verifyJwt,
} from '../../../src/utils/authorization'
import config from 'config'
import { IPassportConfig, IPasswordHashingConfig } from '../../../src/types/interfaces'
import { v4 as uuidv4 } from 'uuid'
import * as argon2 from 'argon2'

const passwordConfig: IPassportConfig = config.get('passport')
const passwordHashingConfig: IPasswordHashingConfig = config.get('passwordHashing')

describe('Authorization utils', () => {
	it('Should hash and compare password', async () => {
		const hash = await hashPassword('secretPassword')
		expect(await comparePassword('secretPassword', hash)).toBe(true)
	})

	it('Should still verify hashes with legacy peppers', async () => {
		const legacyHash = await argon2.hash('secretPassword', {
			secret: Buffer.from(passwordHashingConfig.pepperPrevious),
		})
		expect(await comparePasswordPreviousPepper('secretPassword', legacyHash)).toBe(true)
		expect(await comparePasswordPreviousPepper('wrongPassword', legacyHash)).toBe(false)
	})

	it('Should verify legacy bcrypt hash and migrate it to argon2', async () => {
		const legacyHash = bcrypt.hashSync('secretPassword', bcrypt.genSaltSync(12))
		expect(await comparePasswordBcrypt('secretPassword', legacyHash)).toBe(true)
		expect(await comparePasswordBcrypt('wrongPassword', legacyHash)).toBe(false)

		const migratedHash = await hashPassword('secretPassword')
		expect(await comparePassword('secretPassword', migratedHash)).toBe(true)
		expect(await comparePasswordBcrypt('secretPassword', migratedHash)).toBe(false)
	})

	it('Create jwt and verify', async () => {
		const id = uuidv4()
		const jwt = await createJwt(
			{ uid: id },
			{
				audience: passwordConfig.jwt.user.audience,
				expiresIn: passwordConfig.jwt.user.exp,
			}
		)

		const jwtPayload = await verifyJwt(jwt, passwordConfig.jwt.user.audience)

		expect(jwtPayload).toBeTruthy()
		expect((jwtPayload as any).uid).toBe(id)
	})

	it('Jwt should expire', async () => {
		const id = uuidv4()
		const jwt = await createJwt(
			{ uid: id },
			{
				audience: passwordConfig.jwt.user.audience,
				expiresIn: '2m',
			}
		)
		jest.useFakeTimers('modern')
		jest.setSystemTime(new Date().getTime() + 130000)

		const jwtPayload = await verifyJwt(jwt, passwordConfig.jwt.user.audience)
		expect(jwtPayload).toBeFalsy()

		jest.useRealTimers()
	})
})
