import passport from 'passport'
import i18nextMiddleware from 'i18next-express-middleware'
import i18nextBackend from 'i18next-node-fs-backend'
import express from 'express'
import cors from 'cors'
import config from 'config'
import path from 'path'
import i18next, { InitOptions } from 'i18next'
import { Strategy as JwtStrategy } from 'passport-jwt'
import helmet from 'helmet'

// services
import Sentry, { initSentry } from './services/sentryService'

// middlewares
import errorMiddleware from './middlewares/errorMiddleware'
import sentryMiddleware from './middlewares/sentryMiddleware'

// passport
import { jwtAdminVerify, jwtQrCodeVerify, jwtOrderResponseVerify, jwtResetPasswordVerify } from './passport/jwtVerify'

// utils
import { ENV } from './utils/enums'

// API endpoints
import routerV1 from './api/v1'
import { IAppConfig, IPassportConfig } from './types/interfaces'

// Payment keys
import { checkPaymentKeys } from './services/webpayService'

import routerAdmin from './api/admin'

const passportConfig: IPassportConfig = config.get('passport')
const i18NextConfig: InitOptions = config.get('i18next')
const appConfig: IAppConfig = config.get('app')

// Check payment keys
if (process.env.NODE_ENV !== ENV.test) {
	if (checkPaymentKeys() === false) {
		throw new Error('Invalid payment keys')
	}
}

// Passport configuration
passport.use('jwt', new JwtStrategy({ ...passportConfig.jwt.user, secretOrKey: passportConfig.jwt.secretOrKey }, jwtAdminVerify))
passport.use('jwt-reset-password', new JwtStrategy({ ...passportConfig.jwt.resetPassword, secretOrKey: passportConfig.jwt.secretOrKey }, jwtResetPasswordVerify))
passport.use('jwt-qr-code', new JwtStrategy({ ...passportConfig.jwt.qrCode, secretOrKey: passportConfig.jwt.secretOrKey, passReqToCallback: true }, jwtQrCodeVerify))
passport.use('jwt-order-response', 
	new JwtStrategy({ ...passportConfig.jwt.orderResponse, secretOrKey: passportConfig.jwt.secretOrKey, passReqToCallback: true }, jwtOrderResponseVerify)
)

passport.serializeUser((user, done) => done(null, user))
passport.deserializeUser((user, done) => done(null, user))

// i18n module
i18next
	.use(i18nextMiddleware.LanguageDetector)
	.use(i18nextBackend)
	.init({ ...i18NextConfig }) // it has to be copy otherwise is readonly

const app = express()

if (process.env.NODE_ENV !== ENV.test && process.env.SENTRY_DSN) {
	initSentry(app)
	app.use(Sentry.Handlers.requestHandler() as express.RequestHandler)
	app.use(Sentry.Handlers.tracingHandler())
}

app.use(helmet())
app.use(cors({origin: appConfig.corsOrigins, credentials: true}))
app.use(express.urlencoded({ extended: true, limit:'40mb' }))
app.use(express.json({ limit: '40mb'}))

if (process.env.NODE_ENV !== ENV.production) {
	app.use((req, res, next) => {
		// used for correctly showing documentation in dev, dont use on production!
		res.set("Content-Security-Policy",
			"default-src *; style-src 'self' http://* 'unsafe-inline'; script-src 'self' http://* 'unsafe-inline' 'unsafe-eval'")
		next();
	})
	app.use('/apidoc', express.static('apidoc'))
}

// passport
app.use(passport.initialize())

// i18n module
app.use(i18nextMiddleware.handle(i18next))

app.use('/api/v1', routerV1())
app.use('/api/admin', routerAdmin())
app.use('/files/public', express.static(path.join(process.cwd(), '/files/public')))

if (process.env.NODE_ENV !== ENV.test && process.env.SENTRY_DSN) {
	app.use(sentryMiddleware)
	app.use(Sentry.Handlers.errorHandler() as express.ErrorRequestHandler)
}

app.use(errorMiddleware)

export default app
