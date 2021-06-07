import { IStrategyOptions as IPassportStrategyOptions } from 'passport-local'
import { JwtFromRequestFunction } from 'passport-jwt'

export interface IServerConfig {
	port: number
	filesPath: string
	domain: string
	adminDomain: string
	externalServerURL: string
	subdirs: string[]
}

export interface IAppConfig {
	port: number
	host: string
	subdirs: string[]
	filesPath: string
	corsOrigins: string[]
	logsPath: string
	feResetPasswordUrl: string
	contactEmail: string
	maxTicketPurchaseLimit: number
}

export interface ISentryConfig {
	dsn: string
	env: string
	debug: boolean
	tracesSampleRate: number
}

export interface IGPWebpayConfig {
	httpApi: string
	clientAppUrl: string
	merchantNumber: string
	currency: string
	privateKeyPath: string
	publicKeyPath: string
	gpPublicKeyPath: string
	privateKeyPassword: string,
	provider: string
}


export interface IWorkersConfig {
	schedule: {
	}
}

interface JWTConfig {
	jwtFromRequest: JwtFromRequestFunction
	exp: string,
	audience: string,
	ignoreExpiration?: boolean
}

interface JWTConfigExp {
	exp: string
}

export interface IPassportConfig {
	local: IPassportStrategyOptions,
	jwt: IJWTPassportConfig,
	jwtExternalRegistration: {
		secretOrKey: string,
		options: JWTConfig
	}
}

export interface IJWTPassportConfig {
	secretOrKey: string
	user: JWTConfig
	qrCode: JWTConfig
	orderResponse: JWTConfig
	resetPassword: JWTConfig
	setPassword: JWTConfigExp
	forgottenPassword: JWTConfigExp
}


export interface IJwtPayload {
	s: number,
	uid: string,
	exp: number,
	aud: string
}

export interface IJwtQrCodePayload {
	tid: string,
	exp: number,
	aud: string
}

export interface IJwtResetPasswordPayload {
	uid: string,
	exp: number,
	aud: string
}

/* Services */
export interface IGoogleServiceConfig {
	recaptcha: {
		clientSecret: string
	}
}

export interface IMailguntemplatesConfig {
	resetPassword: string
	order: string
	setPassword: string
}
export interface IMailgunserviceConfig {
	apiKey: string
	domain: string,
	host: string,
	fromEmail: string,
	templates: IMailguntemplatesConfig
}

export interface IGPWebpayHttpRequest {
	MERCHANTNUMBER: string
	OPERATION: string
	ORDERNUMBER: number
	AMOUNT: number
	CURRENCY?: number
	DEPOSITFLAG: number
	MERORDERNUM?: number
	URL: string
	DESCRIPTION?: string
	MD?: string
	USERPARAM1?: string
	PAYMETHOD?: string
	DISABLEPAYMETHOD?: string
	PAYMETHODS?: string
	EMAIL?: string
	REFERENCENUMBER?: string
	ADDINFO?: string
	DIGEST?: string
}

export interface IGPWebpayHttpResponse {
	OPERATION: string
	ORDERNUMBER: number
	MERORDERNUM?: number
	MD?: string
	PRCODE: string
	SRCODE: string
	RESULTTEXT?: string
	USERPARAM1?: string
	ADDINFO?: string
	TOKEN?: string
	EXPIRY?: string
	ACSRES?: string
	ACCODE?: string
	PANPATTERN?: string
	DAYTOCAPTURE?: string
	TOKENREGSTATUS?: string
	ACRC?: string
	RRN?: string
	PAR?: string
	TRACEID?: string
	DIGEST: string
	DIGEST1: string
}

