import { USER_ROLE } from './../utils/enums'
import { Request, Response, NextFunction } from 'express'

import { UserModel } from '../db/models/user'
import schemaMiddleware from './schemaMiddleware'

/**
 * Condition middleware
 * Schema is used based on the user`s role.
 */
export default (conditions: { role: USER_ROLE; schema: any }[]) =>
	(req: Request, res: Response, next: NextFunction) => {
		const user = req.user as UserModel
		for (const condition of conditions) {
			if (condition.role === user.role) {
				if (!condition.schema) {
					throw new Error('Validation schema is not provided')
				}
				return schemaMiddleware(condition.schema)(req, res, next)
			}
		}

		throw new Error('Validation schema is not provided')
	}
