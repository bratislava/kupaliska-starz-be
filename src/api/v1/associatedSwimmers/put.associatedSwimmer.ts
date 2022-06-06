import Joi from 'joi'
import { NextFunction, Request, Response } from 'express'
import { Op, Transaction } from 'sequelize'

import { map } from 'lodash'

import DB, { models } from '../../../db/models'

import { formatAssociatedSwimmer } from '../../../utils/formatters'
import { MESSAGE_TYPE } from '../../../utils/enums'
import {
	azureGetAzureId,
	isAzureAutehnticated,
} from '../../../utils/azureAuthentication'
import { uploadImage } from '../../../utils/imageUpload'
import { AssociatedSwimmerModel } from '../../../db/models/associatedSwimmer'
import ErrorBuilder from '../../../utils/ErrorBuilder'

export const associatedSwimmerUploadFolder = 'private/associated-swimmer'

// TODO change according to Model

export const schema = Joi.object()

const { AssociatedSwimmer, SwimmingLoggedUser } = models

export const workflow = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	try {
		let transaction: Transaction

		const { body, params }: any = req

		transaction = await DB.transaction()
		if (isAzureAutehnticated(req)) {
			const oid = await azureGetAzureId(req)
			if (oid) {
				const swimmingLoggedUser = await SwimmingLoggedUser.findOne({
					attributes: [
						'id',
						'externalId',
						'age',
						'zip',
						'createdAt',
						'updatedAt',
						'deletedAt',
					],
					where: {
						externalId: { [Op.eq]: oid },
					},
				})

				const associatedSwimmer = await AssociatedSwimmer.findOne({
					attributes: ['id', 'swimmingLoggedUserId', 'age', 'zip'],
					where: {
						id: { [Op.eq]: params.associatedSwimmerId },
					},
				})
				if (!associatedSwimmer) {
					throw new ErrorBuilder(
						404,
						req.t('error:associatedSwimmerNotFound')
					)
				}
				if (
					associatedSwimmer.swimmingLoggedUserId ===
					swimmingLoggedUser.id
				) {
					const image = await uploadImage(
						req,
						body.image,
						associatedSwimmer.id,
						AssociatedSwimmerModel.name,
						associatedSwimmerUploadFolder,
						transaction
					)

					associatedSwimmer.image = image
					await associatedSwimmer.update(
						{
							surname: body.surname,
							lastname: body.lastname,
							age: body.age,
							zip: body.zip,
							// TODO update updateAt
							// updatedAt: body.updatedAt,
							// swimmingLoggedUserId: swimmingLoggedUser.id,
						},
						{ transaction }
					)
					await transaction.commit()
					transaction = null

					return res.json({
						data: {
							id: associatedSwimmer.id,
							associatedSwimmer:
								formatAssociatedSwimmer(associatedSwimmer),
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
				} else {
					throw new ErrorBuilder(
						403,
						req.t('error:associatedSwimmer.forbidden')
					)
				}
			}
		}
	} catch (err) {
		return next(err)
	}
}
