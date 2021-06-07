import { Request, NextFunction, Response } from 'express'

// utils
import ErrorBuilder from '../utils/ErrorBuilder'
import { isEmpty } from 'lodash'
import { UserModel } from '../db/models/user'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default (roles: string[]) => ( req: Request, res: Response, next: NextFunction) => {

	if (!roles || isEmpty(roles)) {
		throw new Error('Roles are not provided')
	}
	const user = req.user as UserModel

	if (!user) {
		throw new ErrorBuilder(401, req.t('error:tokenExpired'))
	}

	if (roles.includes(user.role) === false) {
		throw new ErrorBuilder(403, 'Forbidden')
	}

	return next()
}
