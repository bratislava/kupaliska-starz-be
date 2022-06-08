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
import readAsBase64 from '../../../utils/reader'

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
					attributes: ['id', 'externalId', 'age', 'zip'],
					where: {
						externalId: { [Op.eq]: oid },
					},
					include: [{ association: 'image' }],
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

				await uploadImage(
					req,
					body.image,
					swimmingLoggedUser.id,
					SwimmingLoggedUserModel.name,
					swimmingLoggedUserUploadFolder,
					transaction,
					swimmingLoggedUser.image
						? swimmingLoggedUser.image.id
						: undefined
				)

				await transaction.commit()
				await swimmingLoggedUser.reload({
					include: [{ association: 'image' }],
				})
				transaction = null

				let swimmingLoggedUserWithImageBase64 = {
					...formatSwimmingLoggedUser(swimmingLoggedUser),
					image: swimmingLoggedUser.image
						? await readAsBase64(swimmingLoggedUser.image)
						: null,
				}

				return res.json({
					data: {
						id: swimmingLoggedUser.id,
						swimmingLoggedUser: swimmingLoggedUserWithImageBase64,
					},
					messages: [
						{
							type: MESSAGE_TYPE.SUCCESS,
							message: req.t(
								'success:loggedSwimmer.swimmingLoggedUsers.updated'
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
