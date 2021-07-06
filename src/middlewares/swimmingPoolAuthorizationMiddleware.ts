import { Request, NextFunction, Response } from 'express'

// utils
import ErrorBuilder from '../utils/ErrorBuilder'
import { UserModel } from '../db/models/user'
import { USER_ROLE } from '../utils/enums'
import { difference, map } from 'lodash'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
/**
 *  SWIMMING_POOL_OPERATOR and SWIMMING_POOL_EMPLOYEE can access only their swimming pools
 */
export default (extractFrom = 'params') => async (req: Request, res: Response, next: NextFunction) => {

	const { params, query } = req
	const user = req.user as UserModel

	if (user.role !== USER_ROLE.SWIMMING_POOL_OPERATOR &&
		user.role !== USER_ROLE.SWIMMING_POOL_EMPLOYEE
	) {
		return next()
	}

	await user.reload({ include: { association: 'swimmingPools' } })

	const usersSwimmingPools = map(user.swimmingPools, (pool) => pool.id)
	const accessedSwimmingPools = extractFrom === 'params'
		? [ params.swimmingPoolId ]
		: query.swimmingPools as string[]

	if (difference(accessedSwimmingPools, usersSwimmingPools).length === 0) {
		return next()
	}

	return next(new ErrorBuilder(403, 'Forbidden swimming pool'))
}
