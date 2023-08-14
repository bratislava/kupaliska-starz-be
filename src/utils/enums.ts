export enum ENV {
	production = 'production',
	development = 'development',
	test = 'test',
}

export enum LANGUAGE {
	SK = 'sk',
	CZ = 'cz',
	EN = 'en',
}

export enum MESSAGE_TYPE {
	ERROR = 'ERROR',
	WARNING = 'WARNING',
	SUCCESS = 'SUCCESS',
	INFO = 'INFO',
}

export enum TICKET_TYPE {
	SEASONAL = 'SEASONAL',
	ENTRIES = 'ENTRIES',
}

export enum TICKET_CATEGORY {
	ADULT = 'adult',
	CHILDREN_WITH_ADULT = 'children_with_adult',
	CHILDREN_WITHOUT_ADULT = 'children_without_adult',
	SENIOR_OR_DISABLED = 'senior_or_disabled',
}

export enum USER_ROLE {
	BASIC = 'BASIC',
	SWIMMING_POOL_EMPLOYEE = 'SWIMMING_POOL_EMPLOYEE',
	SWIMMING_POOL_OPERATOR = 'SWIMMING_POOL_OPERATOR',
	OPERATOR = 'OPERATOR',
	SUPER_ADMIN = 'SUPER_ADMIN',
}

export enum ORDER_STATE {
	CREATED = 'CREATED', // Order was created, but it`s not paid yet
	PAID = 'PAID',
	FAILED = 'FAILED',
	CANCELED = 'CANCELED',
}

export enum ORDER_STATE_GPWEBPAY {
	CAPTURED = 'CAPTURED',
}

export enum PAYMENT_OPERATION {
	CREATE_ORDER = 'CREATE_ORDER', // Card payment
	CARD_VERIFICATION = 'CARD_VERIFICATION', // Card verification
	FINALIZE_ORDER = 'FINALIZE_ORDER', // MasterPass digital wallet
}

export enum ENTRY_TYPE {
	CHECKIN = 'IN',
	CHECKOUT = 'OUT',
}

export enum ENTRY_FLAG {
	AUTOMATIC = 'A',
	MANUAL = 'M',
}

export enum TICKET_CHECKIN_ERROR_CODE {
	ORDER_NOT_PAID = 1,
	FORBIDDEN_SWIMMING_POOL = 2,
	NOT_BETWEEN_VALID_DATES = 3,
	CUSTOMER_ALREADY_CHECK_IN = 4,
	NOT_ENOUGH_REMAINING_ENTRIES = 5,
	FORBIDDEN_ENTRY_TIME = 6,
	TICKET_DURATION_EXPIRED = 7,
}

export enum TICKET_CHECKOUT_ERROR_CODE {
	CUSTOMER_DID_NOT_CHECK_IN = 1,
	CHECKOUT_AFTER_ALLOWED_TIME = 2,
	CHECKOUT_TICKET_DURATION_EXPIRED = 3,
	FORBIDDEN_SWIMMING_POOL = 4,
}

export enum CHECK_STATUS {
	OK = 'OK',
	NOK = 'NOK',
}

export const MESSAGE_TYPES = Object.values(MESSAGE_TYPE)
export const LANGUAGES = Object.values(LANGUAGE)
export const USER_ROLES = Object.values(USER_ROLE)
export const PAYMENT_OPERATIONS = Object.values(PAYMENT_OPERATION)
export const TICKET_TYPES = Object.values(TICKET_TYPE)
export const ORDER_STATES = Object.values(ORDER_STATE)
export const ENTRY_TYPES = Object.values(ENTRY_TYPE)
export const TICKET_CHECKIN_ERROR_CODES = Object.values(
	TICKET_CHECKIN_ERROR_CODE
)
export const TICKET_CHECKOUT_ERROR_CODES = Object.values(
	TICKET_CHECKOUT_ERROR_CODE
)
export const CHECK_STATUSS = Object.values(CHECK_STATUS)

export const textColorsMap = {
	[TICKET_CATEGORY.ADULT]: { text: '#FFFFFF', background: '#07038C' },
	[TICKET_CATEGORY.CHILDREN_WITHOUT_ADULT]: {
		text: '#07038C',
		background: '#8AEBD9',
	},
	[TICKET_CATEGORY.CHILDREN_WITH_ADULT]: {
		text: '#07038C',
		background: '#7CCEF2',
	},
	[TICKET_CATEGORY.SENIOR_OR_DISABLED]: {
		text: '#07038C',
		background: '#CFD9FC',
	},
}
