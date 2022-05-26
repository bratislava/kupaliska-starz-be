import Joi from 'joi'
import { NextFunction, Request, Response } from 'express'
import { Op } from 'sequelize'
import sequelize, { models } from '../../../db/models'
import ErrorBuilder from '../../../utils/ErrorBuilder'
import {
	azureGetAzureId,
	isAzureAutehnticated,
} from '../../../utils/azureAuthentication'

export const schema = Joi.object()

export const workflow = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	try {
		const { body } = req
		const { SwimmingLoggedUser } = models

		if (isAzureAutehnticated(req)) {
			const oid = await azureGetAzureId(req)
			if (oid) {
				const swimmingLoggedUser = await SwimmingLoggedUser.findOne({
					where: {
						externalId: { [Op.eq]: oid },
					},
				})

				if (!swimmingLoggedUser) {
					throw new ErrorBuilder(404, req.t('error:userNotFound'))
				}

				let transaction: any = null
				transaction = await sequelize.transaction()

				await swimmingLoggedUser.update(
					{
						age: body.age,
						zip: body.zip,
					},
					{ transaction }
				)

				await transaction.commit()
				console.log(`SwimmingLoggedUser data changed!`)
			}
		}

		return res.json(null)
	} catch (err) {
		return next(err)
	}
}
