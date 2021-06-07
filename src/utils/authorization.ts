import bcrypt from 'bcryptjs'
import config from 'config'
import { verify, sign, SignOptions } from 'jsonwebtoken'

import { IPassportConfig } from '../types/interfaces'

const passportConfig: IPassportConfig = config.get('passport')

const BCRYPT_WORK_FACTOR_BASE = 12
const BCRYPT_DATE_BASE = 1483228800000
const BCRYPT_WORK_INCREASE_INTERVAL = 47300000000

export const hashPassword = (password: string, factor?: number) => {
	try {
		const BCRYPT_CURRENT_DATE = new Date().getTime()
		const BCRYPT_WORK_INCREASE = Math.max(0, Math.floor((BCRYPT_CURRENT_DATE - BCRYPT_DATE_BASE) / BCRYPT_WORK_INCREASE_INTERVAL))
		const BCRYPT_WORK_FACTOR = Math.min(19, BCRYPT_WORK_FACTOR_BASE + BCRYPT_WORK_INCREASE)

		const salt = bcrypt.genSaltSync(factor ? factor : BCRYPT_WORK_FACTOR)
		return bcrypt.hashSync(password, salt)

	} catch (e) {
		return e
	}
}

export const comparePassword = async (password: string, hash: string) => bcrypt.compare(password, hash)

// create access token for API protection
export const createJwt = (payload: Object, options: SignOptions): Promise<string> => (
	new Promise((resolve, reject) => {
		sign(payload, passportConfig.jwt.secretOrKey, options, (err, token) => {
			if (err || !token) {
				return reject(err)
			}
			return resolve(token)
		})
	})
)

export const verifyJwt = async (token: string, audience: string) => {
	try {
		return verify(token, passportConfig.jwt.secretOrKey, {
			audience
		})
	} catch (err) {
		return null
	}
}
