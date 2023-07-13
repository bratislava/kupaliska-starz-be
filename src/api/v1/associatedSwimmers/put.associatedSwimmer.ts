import Joi from 'joi'
import { NextFunction, Request, Response } from 'express'
import { Transaction } from 'sequelize'

import DB, { models } from '../../../db/models'

import { formatAssociatedSwimmer } from '../../../utils/formatters'
import { MESSAGE_TYPE } from '../../../utils/enums'
import { uploadImage } from '../../../utils/imageUpload'
import { AssociatedSwimmerModel } from '../../../db/models/associatedSwimmer'
import ErrorBuilder from '../../../utils/ErrorBuilder'
import { getDataAboutCurrentUser } from '../../../utils/getDataCurrentUser'
import readAsBase64 from '../../../utils/reader'

export const associatedSwimmerUploadFolder = 'private/associated-swimmer'

// TODO change according to Model

export const schema = Joi.object()

const { AssociatedSwimmer } = models

export const workflow = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	let transaction: Transaction
	try {
		const { body, params }: any = req

		const swimmingLoggedUser = await getDataAboutCurrentUser(req)

		const associatedSwimmer = await AssociatedSwimmer.findByPk(
			params.associatedSwimmerId,
			{ include: { association: 'image' } }
		)
		if (!associatedSwimmer) {
			throw new ErrorBuilder(
				404,
				req.t('error:associatedSwimmerNotFound')
			)
		}
		if (associatedSwimmer.swimmingLoggedUserId === swimmingLoggedUser.id) {
			transaction = await DB.transaction()
			await associatedSwimmer.update(
				{
					firstname: body.firstname,
					lastname: body.lastname,
					age: body.age,
					zip: body.zip,
					// TODO update updateAt
					// updatedAt: body.updatedAt,
					// swimmingLoggedUserId: swimmingLoggedUser.id,
				},
				{ transaction }
			)
			if (body.image) {
				await uploadImage(
					req,
					body.image,
					associatedSwimmer.id,
					AssociatedSwimmerModel.name,
					associatedSwimmerUploadFolder,
					transaction,
					associatedSwimmer.image
						? associatedSwimmer.image.id
						: undefined
				)
			}
			await transaction.commit()

			await associatedSwimmer.reload({
				include: [{ association: 'image' }],
			})

			let associatedSwimmersWithImageBase64 = {
				...formatAssociatedSwimmer(associatedSwimmer),
				image: associatedSwimmer.image
					? await readAsBase64(associatedSwimmer.image)
					: null,
			}

			return res.json({
				data: {
					id: associatedSwimmer.id,
					associatedSwimmer: associatedSwimmersWithImageBase64,
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
	} catch (err) {
		if (transaction) {
			await transaction.rollback()
		}
		return next(err)
	}
}
