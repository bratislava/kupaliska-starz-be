import Joi from 'joi'
import { NextFunction, Request, Response } from 'express'
import { Op } from 'sequelize'
import { getCognitoIdOfLoggedInUser } from '../../../utils/azureAuthentication'
import ErrorBuilder from '../../../utils/ErrorBuilder'
import { models } from '../../../db/models'

export const schema = Joi.object()

export const workflow = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	try {
		const { SwimmingLoggedUser } = models

		const sub = getCognitoIdOfLoggedInUser(req)

		if (sub) {
			const swimmingLoggedUserExists = await SwimmingLoggedUser.findOne({
				where: {
					externalCognitoId: { [Op.eq]: sub },
				},
			})

			if (!swimmingLoggedUserExists) {
				await SwimmingLoggedUser.create({
					externalCognitoId: sub,
				})
				console.log(
					`SwimmingLoggedUser with externalCognitoId: ${sub} created`
				)
				return res.json(
					`SwimmingLoggedUser with externalCognitoId: ${sub} created`
				)
			} else {
				console.log('SwimmingLoggedUser already exists!')
				return res.json(req.t('error:register.userExists'))
			}
		} else {
			throw new ErrorBuilder(401, req.t('error:ticket.userNotFound'))
		}
	} catch (err) {
		return next(err)
	}
}
