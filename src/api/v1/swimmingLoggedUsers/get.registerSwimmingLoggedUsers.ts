import Joi from 'joi'
import { NextFunction, Request, Response } from 'express'
import jwtDecode, { JwtPayload } from 'jwt-decode'
import { Op } from 'sequelize'
import sequelize, { models } from '../../../db/models'
import ErrorBuilder from '../../../utils/ErrorBuilder'
import fetch from 'node-fetch'

export const schema = Joi.object()

type keysResponse = {
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

export const workflow = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	try {
		const { SwimmingLoggedUser } = models
		const authorization = req.headers.authorization
		const tokenArray = authorization.split(' ')
		const token = tokenArray[1]

		const header = jwtDecode<JwtHeaderAzure>(token, { header: true })
		const payload = jwtDecode<JWTPayloadAzure>(token)

		const { oid } = payload

		// https://bratislavab2c.b2clogin.com/bratislavab2c.onmicrosoft.com/B2C_1_user_module/v2.0/.well-known/openid-configuration
		// jwks_uri -> https://bratislavab2c.b2clogin.com/bratislavab2c.onmicrosoft.com/b2c_1_user_module/discovery/v2.0/keys

		const response = await fetch(
			`https://bratislavab2c.b2clogin.com/bratislavab2c.onmicrosoft.com/${payload.tfp}/discovery/v2.0/keys`
		)
		const data: keysResponse = await response.json()
		const keysKid = data.keys.map((key) => key.kid)

		if (keysKid.includes(header.kid)) {
			if (oid) {
				const swimmingLoggedUserExists =
					await SwimmingLoggedUser.findOne({
						where: {
							externalId: { [Op.eq]: oid },
						},
					})

				console.log(
					'swimmingLoggedUserExists: ',
					swimmingLoggedUserExists
				)

				if (!swimmingLoggedUserExists) {
					let transaction: any = null
					transaction = await sequelize.transaction()

					const order = await SwimmingLoggedUser.create(
						{
							externalId: oid,
						},
						{ transaction }
					)

					await transaction.commit()
					console.log(
						`SwimmingLoggedUser with externalId: ${oid} created`
					)
				} else {
					console.log('SwimmingLoggedUser already exists!')
					throw new ErrorBuilder(
						409,
						req.t('error:register.userExists')
					)
				}
			}
		}

		return res.json(null)
	} catch (err) {
		return next(err)
	}
}
