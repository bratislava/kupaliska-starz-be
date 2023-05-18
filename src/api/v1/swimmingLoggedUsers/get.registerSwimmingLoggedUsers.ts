import Joi from 'joi'
import { NextFunction, Request, Response } from 'express'
import { Op } from 'sequelize'
import { models } from '../../../db/models'
import { getCognitoId } from '../../../utils/azureAuthentication'

export const schema = Joi.object()

export const workflow = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	try {
		const { SwimmingLoggedUser } = models

		const sub = getCognitoId(req)

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
		}
	} catch (err) {
		return next(err)
	}
}
