import bcrypt from 'bcryptjs'
import config from 'config'
import { verify, sign, SignOptions } from 'jsonwebtoken'

import { IPassportConfig } from '../types/interfaces'

const passportConfig: IPassportConfig = config.get('passport')

const BCRYPT_WORK_FACTOR_BASE = 12

export const hashPassword = (password: string) => {
	try {
		const salt = bcrypt.genSaltSync(BCRYPT_WORK_FACTOR_BASE)
		return bcrypt.hashSync(password, salt)
	} catch (e) {
		return e
	}
}

export const comparePassword = async (password: string, hash: string) =>
	bcrypt.compare(password, hash)

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
