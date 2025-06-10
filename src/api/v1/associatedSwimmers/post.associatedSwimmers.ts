import Joi from 'joi'
import { NextFunction, Request, Response } from 'express'
import { Transaction } from 'sequelize'
import dayjs from 'dayjs'

import DB, { models } from '../../../db/models'

import { formatAssociatedSwimmer } from '../../../utils/formatters'
import { MESSAGE_TYPE } from '../../../utils/enums'
import { uploadImage } from '../../../utils/imageUpload'
import { AssociatedSwimmerModel } from '../../../db/models/associatedSwimmer'
import { associatedSwimmerUploadFolder } from './put.associatedSwimmer'
import { getDataAboutCurrentUser } from '../../../utils/getDataCurrentUser'
import { calculateAge } from '../../../utils/helpers'

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
		dateOfBirth: Joi.date()
			.min(dayjs().subtract(3, 'years').startOf('day').toDate())
			.required(),
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
	let transaction: Transaction
	try {
		const { body }: any = req
		const age = calculateAge(body.dateOfBirth)

		transaction = await DB.transaction()
		const swimmingLoggedUser = await getDataAboutCurrentUser(req)

		const associatedSwimmer = await AssociatedSwimmer.create(
			{
				firstname: body.firstname,
				lastname: body.lastname,
				dateOfBirth: body.dateOfBirth,
				age: age,
				zip: body.zip,
				swimmingLoggedUserId: swimmingLoggedUser.id,
			},
			{ transaction }
		)
		await uploadImage(
			req,
			body.image,
			associatedSwimmer.id,
			AssociatedSwimmerModel.name,
			associatedSwimmerUploadFolder,
			transaction,
			associatedSwimmer.image ? associatedSwimmer.image.id : undefined
		)
		await transaction.commit()

		return res.json({
			data: {
				id: associatedSwimmer.id,
				associatedSwimmer: formatAssociatedSwimmer(associatedSwimmer),
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
	} catch (err) {
		if (transaction) {
			await transaction.rollback()
		}
		return next(err)
	}
}
