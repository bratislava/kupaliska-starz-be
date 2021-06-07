import 'dotenv/config'
import path from 'path'
import { InitOptions as I18nextOptions } from 'i18next'
import { ExtractJwt } from 'passport-jwt'
import { ISentryConfig } from '../src/types/interfaces'

export = {
	app: {
		port: process.env.PORT || 8000,
		host: process.env.HOST,
		corsOrigins: JSON.parse(process.env.CORS_ORIGINS || "[]"),
		subdirs: [['private', 'profile-photos'], ['public', 'swimming-pools']],
		feResetPasswordUrl: process.env.FE_RESET_PASSWORD_URL,
		maxTicketPurchaseLimit: process.env.MAX_TICKET_PURCHASE_LIMIT || 10,
		contactEmail: process.env.CONTACT_EMAIL
	},
	sentry: <ISentryConfig>{
		dsn: process.env.SENTRY_DSN || null,
		env: process.env.SENTRY_ENV || false,
		tracesSampleRate: process.env.SENTRY_TRACES_SAMPLE_RATE || 0.01,
		debug: process.env.SENTRY_DEBUG ? (process.env.SENTRY_DEBUG === 'true' ? true : false) : false
	},
	i18next: <I18nextOptions>{
		preload: ['sk'],
		fallbackLng: 'sk',
		ns: ['translation', 'error', 'success', 'email'],
		defaultNS: 'translation',
		detection: {
			order: ['header'],
		},
		backend: {
			loadPath: 'locales/{{lng}}/{{ns}}.json',
			jsonIndent: 2
		}
	},
	passport: {
		jwt: {
			secretOrKey: process.env.JWT_SECRET,
			user: {
				exp: '7d',
				audience: 'jwt',
				jwtFromRequest: ExtractJwt.fromExtractors([ExtractJwt.fromAuthHeaderAsBearerToken(), ExtractJwt.fromUrlQueryParameter('token')])
			},
			resetPassword: {
				audience: 'jwt-reset-password',
				jwtFromRequest: ExtractJwt.fromExtractors([ExtractJwt.fromAuthHeaderAsBearerToken(), ExtractJwt.fromUrlQueryParameter('token')])
			},
			forgottenPassword: {
				exp: '20m',
			},
			setPassword: {
				exp: '2d',
			},
			qrCode: {
				audience: 'jwt-qr-code',
				jwtFromRequest: ExtractJwt.fromExtractors([ExtractJwt.fromHeader('qr-code-authorization')])
			},
			orderResponse: {
				audience: 'jwt-order-response',
				exp: '10m',
				jwtFromRequest: ExtractJwt.fromExtractors([ExtractJwt.fromHeader('order-authorization')])
			},

		}
	},
	passwordComplexityOptions: {
		min: 8,
		max: 30,
		lowerCase: 1,
		upperCase: 1,
		numeric: 1,
	},
	googleService: {
		recaptcha: {
			clientSecret: process.env.RECAPTCHA_CLIENT_SECRET
		}
	},
	mailgunService: {
		apiKey: process.env.MAILGUN_API_KEY,
		domain: process.env.MAILGUN_DOMAIN,
		host: process.env.MAILGUN_HOST,
		fromEmail: process.env.MAILGUN_EMAIL_FROM || 'kupaliska@bratislava.sk',
		templates: {
			resetPassword: process.env.MAILGUN_TEMPLATE_RESET_PASSWORD,
			setPassword: process.env.MAILGUN_TEMPLATE_SET_PASSWORD,
			order: process.env.MAILGUN_TEMPLATE_ORDER,
		}

	},
	gpWebpayService: {
		httpApi: process.env.GP_WEBPAY_HTTP_API_URL || 'https://test.3dsecure.gpwebpay.com/pgw/order.do',
		merchantNumber: process.env.GP_WEBPAY_MERCHANT_NUMBER, // Merchant number
		currency: process.env.GP_WEBPAY_CURRENCY || '978', // Currency number
		privateKeyPath: process.env.GP_WEBPAY_KEYS_PATH ? path.join(process.env.GP_WEBPAY_KEYS_PATH, 'merchant-pvk.key') : path.join(process.cwd(), 'resources', 'keys', 'merchant-pvk.key'), // Merchant private key path
		publicKeyPath: process.env.GP_WEBPAY_KEYS_PATH ? path.join(process.env.GP_WEBPAY_KEYS_PATH, 'merchant-pub.pem') : path.join(process.cwd(), 'resources', 'keys', 'merchant-pub.pem'), // Merchant public key (certificate) path
		gpPublicKeyPath: process.env.GP_WEBPAY_KEYS_PATH ? path.join(process.env.GP_WEBPAY_KEYS_PATH, 'gpe.signing.pem') : path.join(process.cwd(), 'resources', 'keys', 'gpe.signing.pem'), // GPE public key (certificate) path
		privateKeyPassword: process.env.GP_WEBPAY_PRIV_KEY_PASS, // Private key passphrase
		clientAppUrl: process.env.GP_WEBPAY_CLIENT_APP_URL || 'http://starz.dev.amcef.sk', // front-end URL
		provider: process.env.GP_WEBPAY_PROVIDER || '0902' // Provider code = Global Payments s.r.o. – SK
	}
}
