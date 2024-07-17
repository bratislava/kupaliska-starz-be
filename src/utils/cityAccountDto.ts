import { AccountType } from './enums'
// more as a reference than something you should rely upon
// used only with Partial, unless we'll write FE validation
export interface CityAccountUser {
	Enabled: boolean
	UserCreateDate: string
	UserLastModifiedDate: string
	UserStatus: string
	address: string
	'custom:sing_in_at': string
	'custom:tier': string
	'custom:account_type': AccountType
	email: string
	email_verified: string
	family_name: string
	given_name: string
	idUser: string
	phone_number: string
	phone_number_verified: string
	sub: string
}
