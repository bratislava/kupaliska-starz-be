import 'dotenv/config'
import path from 'path'
import { InitOptions as I18nextOptions } from 'i18next'
import { ExtractJwt } from 'passport-jwt'

export = {
	app: {
		port: process.env.PORT || 8000,
		host: process.env.HOST,
		corsOrigins: JSON.parse(process.env.CORS_ORIGINS || '[]'),
		subdirs: [
			['private', 'profile-photos'],
			['private', 'swimming-logged-user'],
			['private', 'associated-swimmer'],
			['public', 'swimming-pools'],
		],
		feResetPasswordUrl: process.env.FE_RESET_PASSWORD_URL,
		maxTicketPurchaseLimit: process.env.MAX_TICKET_PURCHASE_LIMIT || 10,
		contactEmail: process.env.CONTACT_EMAIL,
		minZipCodeFrequency: process.env.MIN_ZIP_CODE_FREQUENCY || 10,
		commissionCoefficient: process.env.COMMISSION_COEFFICIENT || 0.015,
	},
	workers: {
		schedule: {
			visitsComputation:
				process.env.SCHEDULE_VISITS_COMPUTATION || '00 00 23 * * *', // Run visits computation at 23:00 every day
			refreshCustomersView:
				process.env.SCHEDULE_REFRESH_CUSTOMERS_VIEW || '00 00 23 * * *', // Refresh customers views at 23:00 every day
			checkCreatedUnpaidOrders:
				process.env.SCHEDULE_CHECK_CREATED_UNPAID_ORDERS ||
				'0 */5 * * * *', // check created unpaid orders every 5 minutes
		},
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
			jsonIndent: 2,
		},
	},
	passport: {
		jwt: {
			secretOrKey: process.env.JWT_SECRET,
			user: {
				exp: '7d',
				audience: 'jwt',
				jwtFromRequest: ExtractJwt.fromExtractors([
					ExtractJwt.fromAuthHeaderAsBearerToken(),
					ExtractJwt.fromUrlQueryParameter('token'),
				]),
			},
			resetPassword: {
				audience: 'jwt-reset-password',
				jwtFromRequest: ExtractJwt.fromExtractors([
					ExtractJwt.fromAuthHeaderAsBearerToken(),
					ExtractJwt.fromUrlQueryParameter('token'),
				]),
			},
			forgottenPassword: {
				exp: '20m',
			},
			setPassword: {
				exp: '2d',
			},
			orderResponse: {
				audience: 'jwt-order-response',
				exp: '10m',
				jwtFromRequest: ExtractJwt.fromExtractors([
					ExtractJwt.fromHeader('order-authorization'),
				]),
			},
		},
	},
	passwordComplexityOptions: {
		min: 8,
		max: 30,
		lowerCase: 1,
		upperCase: 1,
		numeric: 1,
	},
	mailgunService: {
		apiKey: process.env.MAILGUN_API_KEY,
		domain: process.env.MAILGUN_DOMAIN,
		host: process.env.MAILGUN_HOST || 'https://api.eu.mailgun.net',
		fromEmail: process.env.MAILGUN_EMAIL_FROM || 'kupaliska@bratislava.sk',
		templates: {
			resetPassword: process.env.MAILGUN_TEMPLATE_RESET_PASSWORD,
			setPassword: process.env.MAILGUN_TEMPLATE_SET_PASSWORD,
			order: process.env.MAILGUN_TEMPLATE_ORDER,
		},
	},
	gpWebpayService: {
		httpApi: process.env.GP_WEBPAY_HTTP_API_URL,
		httpGPWebpayWebservice: process.env.GP_WEBPAY_HTTP_WEBSERVICE_API_URL,
		merchantNumber: process.env.GP_WEBPAY_MERCHANT_NUMBER, // Merchant number
		currency: process.env.GP_WEBPAY_CURRENCY, // Currency number
		privateKeyPath: process.env.GP_WEBPAY_KEYS_PATH
			? path.join(process.env.GP_WEBPAY_KEYS_PATH, 'merchant-pvk.key')
			: path.join(process.cwd(), 'resources', 'keys', 'merchant-pvk.key'), // Merchant private key path
		publicKeyPath: process.env.GP_WEBPAY_KEYS_PATH
			? path.join(process.env.GP_WEBPAY_KEYS_PATH, 'merchant-pub.pem')
			: path.join(process.cwd(), 'resources', 'keys', 'merchant-pub.pem'), // Merchant public key (certificate) path
		gpPublicKeyPath: process.env.GP_WEBPAY_KEYS_PATH
			? path.join(process.env.GP_WEBPAY_KEYS_PATH, 'gpe.signing.pem')
			: path.join(process.cwd(), 'resources', 'keys', 'gpe.signing.pem'), // GPE public key (certificate) path
		privateKeyPassword: process.env.GP_WEBPAY_PRIV_KEY_PASS, // Private key passphrase
		clientAppUrl:
			process.env.GP_WEBPAY_CLIENT_APP_URL ||
			'http://kupaliska.bratislava.sk', // front-end URL
		provider: process.env.GP_WEBPAY_PROVIDER, // Provider code = Global Payments s.r.o. – SK
	},
	minio: {
		endPoint: process.env.MINIO_ENDPOINT || 's3.bratislava.sk',
		port: process.env.MINIO_PORT || 443,
		accessKey: process.env.MINIO_ACCESS_KEY,
		secretKey: process.env.MINIO_SECRET_KEY,
	},
	appleWallet: {
		certificatePassword: process.env.APPLE_WALLET_CERTIFICATE_PASSWORD,
	},
}
