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
		const { SwimmingLoggedUser } = models
		if (await isAzureAutehnticated(req)) {
			const oid = await azureGetAzureId(req)
			if (oid) {
				const swimmingLoggedUserExists =
					await SwimmingLoggedUser.findOne({
						where: {
							externalId: { [Op.eq]: oid },
						},
					})

				console.log(
					'swimmingLoggedUserExists: ',
					swimmingLoggedUserExists
				)

				if (!swimmingLoggedUserExists) {
					let transaction: any = null
					transaction = await sequelize.transaction()

					const order = await SwimmingLoggedUser.create(
						{
							externalId: oid,
						},
						{ transaction }
					)

					await transaction.commit()
					console.log(
						`SwimmingLoggedUser with externalId: ${oid} created`
					)
				} else {
					console.log('SwimmingLoggedUser already exists!')
					throw new ErrorBuilder(
						409,
						req.t('error:register.userExists')
					)
				}
			}
		}

		return res.json(null)
	} catch (err) {
		return next(err)
	}
}
