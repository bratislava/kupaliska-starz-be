import passport from 'passport'
import i18nextMiddleware from 'i18next-http-middleware'
import i18nextBackend from 'i18next-node-fs-backend'
import express from 'express'
import cors from 'cors'
import config from 'config'
import i18next, { InitOptions } from 'i18next'
import { ExtractJwt, Strategy as JwtStrategy } from 'passport-jwt'
import { passportJwtSecret } from 'jwks-rsa'
import helmet from 'helmet'

// middlewares
import errorMiddleware from './middlewares/errorMiddleware'

// passport
import {
	jwtAdminVerify,
	jwtQrCodeVerify,
	jwtOrderResponseVerify,
	jwtResetPasswordVerify,
	jwtCognitoUserVerify,
} from './passport/jwtVerify'

// utils
import { ENV } from './utils/enums'

// API endpoints
import routerV1 from './api/v1'
import { IAppConfig, IPassportConfig } from './types/interfaces'

// Payment keys
import { checkPaymentKeys } from './services/webpayService'

import routerAdmin from './api/admin'
import {
	downloadFileFromBucket,
	minioStaticServeMiddleware,
} from './utils/minio'
import { readFile } from 'fs/promises'
import { CognitoStrategy } from './types/models'
import { httpLogger } from './utils/logger'

const passportConfig: IPassportConfig = config.get('passport')
const i18NextConfig: InitOptions = config.get('i18next')
const appConfig: IAppConfig = config.get('app')

// Check payment keys in production
if (process.env.NODE_ENV !== ENV.test) {
	if (checkPaymentKeys() === false) {
		throw new Error('Invalid payment keys')
	}
}

// Passport configuration
passport.use(
	'jwt',
	new JwtStrategy(
		{
			...passportConfig.jwt.user,
			secretOrKey: passportConfig.jwt.secretOrKey,
		},
		jwtAdminVerify
	)
)
passport.use(
	'jwt-reset-password',
	new JwtStrategy(
		{
			...passportConfig.jwt.resetPassword,
			secretOrKey: passportConfig.jwt.secretOrKey,
		},
		jwtResetPasswordVerify
	)
)
passport.use(
	'jwt-order-response',
	new JwtStrategy(
		{
			...passportConfig.jwt.orderResponse,
			secretOrKey: passportConfig.jwt.secretOrKey,
			passReqToCallback: true,
		},
		jwtOrderResponseVerify
	)
)

passport.use(
	'jwt-cognito',
	new CognitoStrategy(
		{
			jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
			ignoreExpiration: false,
			_audience: process.env.AWS_COGNITO_COGNITO_CLIENT_ID,
			issuer: `https://cognito-idp.${process.env.AWS_COGNITO_REGION}.amazonaws.com/${process.env.AWS_COGNITO_USERPOOL_ID}`,
			algorithms: ['RS256'],
			secretOrKeyProvider: passportJwtSecret({
				cache: true,
				rateLimit: true,
				jwksRequestsPerMinute: 5,
				jwksUri: `https://cognito-idp.${process.env.AWS_COGNITO_REGION}.amazonaws.com/${process.env.AWS_COGNITO_USERPOOL_ID}/.well-known/jwks.json`,
			}),
		},
		jwtCognitoUserVerify
	)
)

passport.serializeUser((user, done) => done(null, user))
passport.deserializeUser((user, done) => done(null, user))

// i18n module
i18next
	.use(i18nextMiddleware.LanguageDetector)
	.use(i18nextBackend)
	.init({ ...i18NextConfig }) // it has to be copy otherwise is readonly

const app = express()

app.use(helmet())
app.use(cors({ origin: appConfig.corsOrigins, credentials: true }))
app.use(express.urlencoded({ extended: true, limit: '40mb' }))
app.use(express.json({ limit: '40mb' }))
app.use(httpLogger)

if (process.env.NODE_ENV !== ENV.production) {
	app.use((req, res, next) => {
		// used for correctly showing documentation in dev, dont use on production!
		res.set(
			'Content-Security-Policy',
			"default-src *; style-src 'self' http://* 'unsafe-inline'; script-src 'self' http://* 'unsafe-inline' 'unsafe-eval'"
		)
		next()
	})
	app.use('/apidoc', express.static('apidoc'))
}

// passport
app.use(passport.initialize())

// i18n module
app.use(i18nextMiddleware.handle(i18next))

app.use('/api/v1', routerV1())
app.use('/api/admin', routerAdmin())

// 'staticly-serves' the entire 'files/public' portion of the kupaliska-starz bucket
app.use('/files/public', minioStaticServeMiddleware('/files/public'))

// used mainly to expose static assets for wallet passes
app.use('/public', express.static('files/public'))

// TODO only for testing, remove
app.use('/api/test-download-base64', async (_req, res) => {
	const fullFilePath =
		'files/private/swimming-logged-user/file-1654531467171.jpeg'
	await downloadFileFromBucket(fullFilePath)
	const base64File = await readFile(fullFilePath, { encoding: 'base64' })
	res.json({ base64: base64File })
})

app.use(errorMiddleware)

export default app
