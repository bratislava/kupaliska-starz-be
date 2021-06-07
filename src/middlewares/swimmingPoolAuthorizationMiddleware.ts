import { Request, NextFunction, Response } from 'express'

// utils
import ErrorBuilder from '../utils/ErrorBuilder'
import { UserModel } from '../db/models/user'
import { USER_ROLE } from '../utils/enums'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
/**
 *  SWIMMING_POOL_OPERATOR and SWIMMING_POOL_EMPLOYEE can access only their swimming pools
 */
export default () => async (req: Request, res: Response, next: NextFunction) => {

	const { params } = req
	const user = req.user as UserModel

	if (user.role !== USER_ROLE.SWIMMING_POOL_OPERATOR &&
		user.role !== USER_ROLE.SWIMMING_POOL_EMPLOYEE
	) {
		return next()
	}

	await user.reload({ include: { association: 'swimmingPools' } })
	for (const pool of user.swimmingPools) {
		if (params.swimmingPoolId === pool.id) {
			return next()
		}
	}
	return next(new ErrorBuilder(403, 'Forbidden swimming pool'))
}
