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
import { associatedSwimmerUploadFolder } from './put.associatedSwimmer'
import ErrorBuilder from '../../../utils/ErrorBuilder'
import { getDataAboutCurrentUser } from '../../../utils/getDataCurrentUser'

// TODO change according to Model
// export const schema = Joi.object().keys({
// 	body: Joi.object(),
// 	query: Joi.object().keys({
// 		// search: Joi.string().allow(null, ''),
// 		// limit: Joi.number().integer().min(1).default(20).empty(['', null]),
// 		// page: Joi.number().integer().min(1).default(1).empty(['', null]),
// 		// order: Joi.string().valid(
// 		// 	'name',
// 		// 	'description',
// 		// 	'price',
// 		// 	'type',
// 		// 	'createdAt',
// 		// ).empty(['', null]).default('name'),
// 		// direction: Joi.string().lowercase().valid('asc', 'desc').empty(['', null]).default('asc')
// 	}),
// 	params: Joi.object(),
// })

export const schema = Joi.object().keys({
	body: Joi.object().keys({
		firstname: Joi.string().required(),
		lastname: Joi.string().required(),
		age: Joi.number().integer().min(3).required(),
		zip: Joi.string().allow(null, ''),
		image: Joi.string().required(),
	}),
	query: Joi.object(),
	params: Joi.object(),
})

const { AssociatedSwimmer } = models

export const workflow = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	try {
		let transaction: Transaction

		const { body }: any = req

		transaction = await DB.transaction()
		if (isAzureAutehnticated(req)) {
			const oid = await azureGetAzureId(req)
			if (oid) {
				const swimmingLoggedUser = await getDataAboutCurrentUser(req)

				const associatedSwimmer = await AssociatedSwimmer.create(
					{
						firstname: body.firstname,
						lastname: body.lastname,
						age: body.age,
						zip: body.zip,
						swimmingLoggedUserId: swimmingLoggedUser.id,
					},
					{ transaction }
				)
				await transaction.commit()
				transaction = await DB.transaction()
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
								'success:loggedSwimmer.associatedSwimmer.created'
							),
						},
					],
				})
			}
		} else {
			throw new ErrorBuilder(401, req.t('error:userNotAuthenticated'))
		}
	} catch (err) {
		return next(err)
	}
}
