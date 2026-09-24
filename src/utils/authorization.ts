import bcrypt from 'bcryptjs'
import config from 'config'
import * as argon2 from 'argon2'
import { verify, sign, SignOptions } from 'jsonwebtoken'

import { IPassportConfig, IPasswordHashingConfig } from '../types/interfaces'

const passportConfig: IPassportConfig = config.get('passport')
const passwordHashingConfig: IPasswordHashingConfig = config.get('passwordHashing')

const peppers = new Map(
	Object.entries(passwordHashingConfig.peppers).map(([id, pepper]) => [
		Number(id),
		Buffer.from(pepper),
	])
)
const currentPepperId = Number(passwordHashingConfig.currentPepperId)

if (!currentPepperId && currentPepperId !== 0) {
	throw new Error(`PASSWORD_PEPPER_CURRENT_ID is not configured or is not a Number`)
}

if (!peppers.has(currentPepperId)) {
	throw new Error(
		`Pepper PASSWORD_PEPPER_${passwordHashingConfig.currentPepperId} set by PASSWORD_PEPPER_CURRENT_ID is not configured`
	)
}

export const hashPassword = async (password: string) => ({
	hash: await argon2.hash(password, { secret: peppers.get(currentPepperId) }),
	passwordPepperId: currentPepperId,
})

// TODO remove after successful migration from bcrypt to argon,
// remove test as well
export const comparePasswordBcrypt = async (password: string, hash: string) => {
	return bcrypt.compare(password, hash)
}

export const verifyPassword = async (
	password: string,
	hash: string,
	passwordPepperId: number | null
) => {
	// TODO remove after successful migration from bcrypt to argon
	if (passwordPepperId === null) {
		const isVerified = await comparePasswordBcrypt(password, hash)
		return { isVerified, needsRehash: isVerified }
	}

	const pepper = peppers.get(passwordPepperId)
	// pepper was retired, user has to reset password
	if (!pepper) {
		return { isVerified: false, needsRehash: false }
	}

	const isVerified = await argon2.verify(hash, password, { secret: pepper })
	return { isVerified, needsRehash: isVerified && passwordPepperId !== currentPepperId }
}

// create access token for API protection
export const createJwt = (payload: Object, options: SignOptions): Promise<string> =>
	new Promise((resolve, reject) => {
		sign(payload, passportConfig.jwt.secretOrKey, options, (err, token) => {
			if (err || !token) {
				return reject(err)
			}
			return resolve(token)
		})
	})

export const verifyJwt = async (token: string, audience: string) => {
	try {
		return verify(token, passportConfig.jwt.secretOrKey, {
			audience,
		})
	} catch (err) {
		return null
	}
}
