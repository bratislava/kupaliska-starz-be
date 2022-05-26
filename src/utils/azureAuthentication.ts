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

interface JwtHeaderAzure {
	alg?: string
	kid?: string
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

export const isAzureAutehnticated = async (req: any) => {
	const authorization = req.headers.authorization
	const tokenArray = authorization.split(' ')
	const token = tokenArray[1]

	const header = jwtDecode<JwtHeaderAzure>(token, { header: true })
	const payload = jwtDecode<JWTPayloadAzure>(token)

	// https://bratislavab2c.b2clogin.com/bratislavab2c.onmicrosoft.com/B2C_1_user_module/v2.0/.well-known/openid-configuration
	// jwks_uri -> https://bratislavab2c.b2clogin.com/bratislavab2c.onmicrosoft.com/b2c_1_user_module/discovery/v2.0/keys

	const response = await fetch(
		`https://bratislavab2c.b2clogin.com/bratislavab2c.onmicrosoft.com/${payload.tfp}/discovery/v2.0/keys`
	)
	const data: keysResponse = await response.json()
	const keysKid = data.keys.map((key) => key.kid)

	return keysKid.includes(header.kid)
}

export const azureGetAzureId = async (req: any) => {
	const authorization = req.headers.authorization
	const tokenArray = authorization.split(' ')
	const token = tokenArray[1]

	const payload = jwtDecode<JWTPayloadAzure>(token)

	const { oid } = payload

	return oid
}
