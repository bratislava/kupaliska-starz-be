import jwtDecode, { JwtPayload } from 'jwt-decode'
import { Request } from 'express'
import { ICognitoAccessToken } from '../types/interfaces'

interface keysResponse {
	keys: [
		{
			kid: string
			nbf: number
			use: string
			kty: string
			e: string
			n: string
		}
	]
}

interface JWTPayloadAzure extends JwtPayload {
	ver: string
	nonce: string
	auth_time: number
	oid: string
	newUser: boolean
	given_name: string
	family_name: string
	tfp: string
}

export const getCognitoIdOfLoggedInUser = (req: Request): string | null => {
	const user = req?.user ? (req.user as ICognitoAccessToken) : null

	return typeof user?.sub === 'string' ? user.sub : null
}

export const azureGetAzureData = async (req: any) => {
	const authorization = req.headers.authorization
	if (authorization === undefined) {
		return undefined
	}
	const tokenArray = authorization.split(' ')
	const token = tokenArray[1]

	const payload = jwtDecode<JWTPayloadAzure>(token)

	return payload
}
