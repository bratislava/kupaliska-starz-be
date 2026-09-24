import bcrypt from 'bcryptjs'
import {
	comparePasswordBcrypt,
	createJwt,
	hashPassword,
	verifyJwt,
	verifyPassword,
} from '../../../src/utils/authorization'
import config from 'config'
import { IPassportConfig, IPasswordHashingConfig } from '../../../src/types/interfaces'
import { v4 as uuidv4 } from 'uuid'
import * as argon2 from 'argon2'

const passwordConfig: IPassportConfig = config.get('passport')
const passwordHashingConfig: IPasswordHashingConfig = config.get('passwordHashing')
const currentPepperId = Number(passwordHashingConfig.currentPepperId)
const previousPepperId = Number(
	Object.keys(passwordHashingConfig.peppers).find((id) => Number(id) !== currentPepperId)
)

describe('Authorization utils', () => {
	it('Should hash password with current pepper and verify it', async () => {
		const { hash, passwordPepperId } = await hashPassword('secretPassword')
		expect(passwordPepperId).toBe(currentPepperId)
		expect(await verifyPassword('secretPassword', hash, passwordPepperId)).toEqual({
			isVerified: true,
			needsRehash: false,
		})
		expect(await verifyPassword('wrongPassword', hash, passwordPepperId)).toEqual({
			isVerified: false,
			needsRehash: false,
		})
	})

	it('Should verify hashes with previous pepper and request rehash', async () => {
		const previousPepperHash = await argon2.hash('secretPassword', {
			secret: Buffer.from(passwordHashingConfig.peppers[previousPepperId]),
		})
		expect(await verifyPassword('secretPassword', previousPepperHash, previousPepperId)).toEqual({
			isVerified: true,
			needsRehash: true,
		})
		expect(await verifyPassword('wrongPassword', previousPepperHash, previousPepperId)).toEqual({
			isVerified: false,
			needsRehash: false,
		})
	})

	it('Should not verify hashes with retired pepper', async () => {
		const { hash } = await hashPassword('secretPassword')
		expect(await verifyPassword('secretPassword', hash, 999999)).toEqual({
			isVerified: false,
			needsRehash: false,
		})
	})

	it('Should verify legacy bcrypt hash and request rehash', async () => {
		const legacyHash = bcrypt.hashSync('secretPassword', bcrypt.genSaltSync(12))
		expect(await verifyPassword('secretPassword', legacyHash, null)).toEqual({
			isVerified: true,
			needsRehash: true,
		})
		expect(await verifyPassword('wrongPassword', legacyHash, null)).toEqual({
			isVerified: false,
			needsRehash: false,
		})

		const { hash } = await hashPassword('secretPassword')
		expect(await comparePasswordBcrypt('secretPassword', hash)).toBe(false)
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
