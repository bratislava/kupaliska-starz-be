export const FE_ROUTES = {
	ORDER_SUCCESSFUL: '/objednavka-uspesna',
	ORDER_UNSUCCESSFUL: '/objednavka-neuspesna',
}

// single source of truth for password-related body field names - used by request schemas,
// logger redaction and ErrorBuilder to keep them in sync
export const PASSWORD_FIELD_NAMES = {
	PASSWORD: 'password',
	PASSWORD_CONFIRMATION: 'passwordConfirmation',
	OLD_PASSWORD: 'oldPassword',
} as const

export const SENSITIVE_PASSWORD_FIELDS = Object.values(PASSWORD_FIELD_NAMES)
