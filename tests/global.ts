import config from 'config'
import { createJwt } from '../src/utils/authorization'
import { IPassportConfig } from '../src/types/interfaces'
import {
	ticketId,
	ticket2Id,
	ticket3Id,
	ticketAllowedSwimmingPoolId,
	ticket2AllowedSwimmingPoolId,
	ticket3AllowedSwimmingPoolId,
} from '../src/db/seeders/test/03-tickets'
import {
	superAdmin,
	basic,
	operator,
	swimmingPoolEmployee,
	swimmingPoolOperator,
} from '../src/db/seeders/test/00-users'

const passportConfig: IPassportConfig = config.get('passport')

const { env } = <any>process

export default async () => {
	// Time
	env.globalTime = '2021-05-12 15:00:00'
	// Users
	env.superAdminId = superAdmin
	env.operatorId = operator
	env.baseId = basic
	env.swimmingPoolOperatorId = swimmingPoolOperator
	env.swimmingPoolEmployeeId = swimmingPoolEmployee
	// User tokens
	env.jwtSuperAdmin = await createJwt(
		{ uid: superAdmin, s: 1 },
		{ audience: passportConfig.jwt.user.audience }
	)
	env.jwtOperator = await createJwt(
		{ uid: operator, s: 1 },
		{ audience: passportConfig.jwt.user.audience }
	)
	env.jwtBase = await createJwt(
		{ uid: basic, s: 1 },
		{ audience: passportConfig.jwt.user.audience }
	)
	env.jwtSwimmingPoolOperator = await createJwt(
		{ uid: swimmingPoolOperator, s: 1 },
		{ audience: passportConfig.jwt.user.audience }
	)
	env.jwtSwimmingPoolEmployee = await createJwt(
		{ uid: swimmingPoolEmployee, s: 1 },
		{ audience: passportConfig.jwt.user.audience }
	)
	// Forgoten password
	env.jwtResetPassword = await createJwt(
		{ uid: operator },
		{ audience: passportConfig.jwt.resetPassword.audience }
	)
	env.jwtResetPasswordUserId = operator
	// Tickets
	env.ticketId = ticketId
	env.ticketAllowedSwimmingPoolId = ticketAllowedSwimmingPoolId
	env.ticket2Id = ticket2Id
	env.ticket2AllowedSwimmingPoolId = ticket2AllowedSwimmingPoolId
	env.ticket3Id = ticket3Id
	env.ticket3AllowedSwimmingPoolId = ticket3AllowedSwimmingPoolId
	env.jwtTicket = await createJwt(
		{ tid: ticketId },
		{ audience: passportConfig.jwt.qrCode.audience }
	)
	env.jwtTicket2 = await createJwt(
		{ tid: ticket2Id },
		{ audience: passportConfig.jwt.qrCode.audience }
	)
	env.jwtTicket3 = await createJwt(
		{ tid: ticket3Id },
		{ audience: passportConfig.jwt.qrCode.audience }
	)
}
