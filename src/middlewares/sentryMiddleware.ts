import { Request, Response, NextFunction } from 'express'
import { UserModel } from '../db/models/user'
import Sentry from '../services/sentryService'

export default (
	err: Error,
	req: Request,
	_res: Response,
	next: NextFunction
) => {
	const user = <UserModel>req.user

	Sentry.configureScope((scope) => {
		scope.setUser({
			id: user ? user.id : '',
			name: user ? user.name : '',
			email: user ? user.email : '',
			ip_address: req.ip,
		})
	})
	next(err)
}
