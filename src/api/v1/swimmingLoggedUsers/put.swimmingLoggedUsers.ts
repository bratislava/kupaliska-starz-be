import Joi from 'joi'
import { NextFunction, Request, Response } from 'express'
import { Op, Transaction } from 'sequelize'
import sequelize, { models } from '../../../db/models'
import ErrorBuilder from '../../../utils/ErrorBuilder'
import { getCognitoId } from '../../../utils/azureAuthentication'
import { formatSwimmingLoggedUser } from '../../../utils/formatters'
import { MESSAGE_TYPE } from '../../../utils/enums'
import { uploadImage } from '../../../utils/imageUpload'
import { SwimmingLoggedUserModel } from '../../../db/models/swimmingLoggedUser'
import readAsBase64 from '../../../utils/reader'

export const swimmingLoggedUserUploadFolder = 'private/swimming-logged-user'
export const schema = Joi.object()

const { SwimmingLoggedUser } = models

export const workflow = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	let transaction: Transaction | null = null
	try {
		const { body } = req
		const sub = await getCognitoId(req)
		if (sub) {
			const swimmingLoggedUser = await SwimmingLoggedUser.findOne({
				attributes: ['id', 'externalCognitoId', 'age', 'zip'],
				where: {
					externalCognitoId: { [Op.eq]: sub },
				},
				include: [{ association: 'image' }],
			})

			if (!swimmingLoggedUser) {
				throw new ErrorBuilder(404, req.t('error:userNotFound'))
			}
			transaction = await sequelize.transaction()
			if (!swimmingLoggedUser.age && !body.age) {
				throw new ErrorBuilder(400, req.t('error:ageNotFound'))
			}
			if (!swimmingLoggedUser.image && !body.image) {
				throw new ErrorBuilder(400, req.t('error:photoNotFound'))
			}
			await swimmingLoggedUser.update(
				{
					age: body.age ? body.age : swimmingLoggedUser.age,
					zip: body.zip,
				},
				{ transaction }
			)
			if (body.image) {
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
			}

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
	} catch (err) {
		if (transaction) transaction.rollback()
		return next(err)
	}
}
