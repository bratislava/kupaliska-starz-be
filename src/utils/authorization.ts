import bcrypt from 'bcryptjs'
import config from 'config'
import * as argon2 from 'argon2'
import { verify, sign, SignOptions } from 'jsonwebtoken'

import { IPassportConfig, IPasswordHashingConfig } from '../types/interfaces'

const passportConfig: IPassportConfig = config.get('passport')
const passwordHashingConfig: IPasswordHashingConfig = config.get('passwordHashing')

export const hashPassword = (password: string) => {
	return argon2.hash(password, { secret: Buffer.from(passwordHashingConfig.pepperCurrent) })
}

export const comparePassword = async (password: string, hash: string) => {
	return argon2.verify(hash, password, {
		secret: Buffer.from(passwordHashingConfig.pepperCurrent),
	})
}

export const comparePasswordPreviousPepper = async (password: string, hash: string) => {
	return argon2.verify(hash, password, {
		secret: Buffer.from(passwordHashingConfig.pepperPrevious),
	})
}

// TODO remove after successful migration from bcrypt to argon,
// remove test as well
export const comparePasswordBcrypt = async (password: string, hash: string) => {
	return bcrypt.compare(password, hash)
}

export const verifyPasswordWithFallback = async (password: string, hash: string) => {
	if (await comparePassword(password, hash)) {
		return { isVerified: true, isVerifiedViaFallback: false }
	}

	const isVerifiedViaFallback =
		(await comparePasswordPreviousPepper(password, hash)) || (await comparePasswordBcrypt(password, hash))

	return { isVerified: isVerifiedViaFallback, isVerifiedViaFallback }
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
