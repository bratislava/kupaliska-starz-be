import jwtDecode, { JwtPayload } from 'jwt-decode'
import fetch from 'node-fetch'

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

export const getCognitoId = (req: any) => {
	const { sub } = req.user

	return sub
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

export const getCognitoDataFromToken = async (req: any) => {
	return req.user
}

// export const getCognitoData
