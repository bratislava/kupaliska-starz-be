import Joi from 'joi'
import { NextFunction, Request, Response } from 'express'
import { Op } from 'sequelize'
import sequelize, { models } from '../../../db/models'
import ErrorBuilder from '../../../utils/ErrorBuilder'
import {
	azureGetAzureId,
	isAzureAutehnticated,
} from '../../../utils/azureAuthentication'
import { formatSwimmingLoggedUser } from '../../../utils/formatters'
import { MESSAGE_TYPE } from '../../../utils/enums'
import { uploadImage } from '../../../utils/imageUpload'
import { SwimmingLoggedUserModel } from '../../../db/models/swimmingLoggedUser'

export const swimmingLoggedUserUploadFolder = 'private/swimming-logged-user'
export const schema = Joi.object()

const { SwimmingLoggedUser, File } = models

export const workflow = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	try {
		const { body } = req

		if (await isAzureAutehnticated(req)) {
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

				const image = await uploadImage(
					req,
					body.image,
					swimmingLoggedUser.id,
					SwimmingLoggedUserModel.name,
					swimmingLoggedUserUploadFolder,
					transaction
				)
				swimmingLoggedUser.image = image

				await swimmingLoggedUser.update(
					{
						age: body.age,
						zip: body.zip,
					},
					{ transaction }
				)

				await transaction.commit()
				transaction = null
				return res.json({
					data: {
						id: swimmingLoggedUser.id,
						swimmingLoggedUser:
							formatSwimmingLoggedUser(swimmingLoggedUser),
					},
					messages: [
						{
							type: MESSAGE_TYPE.SUCCESS,
							message: req.t(
								'success:loggedSwimmer.associatedSwimmer.updated'
							),
						},
					],
				})
			}
		} else {
			throw new ErrorBuilder(401, req.t('error:incorrectToken'))
		}
	} catch (err) {
		return next(err)
	}
}
