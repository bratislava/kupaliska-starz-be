import Joi from 'joi'
import { NextFunction, Request, Response } from 'express'
import { Op } from 'sequelize'

import { models } from '../../../db/models'
import { formatSwimmingLoggedUser } from '../../../utils/formatters'
import {
	getCognitoDataFromToken,
	getCognitoId,
} from '../../../utils/azureAuthentication'
import readAsBase64 from '../../../utils/reader'

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

export const schema = Joi.object()

const { SwimmingLoggedUser } = models

export const workflow = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	try {
		const loggedUser = await getCognitoDataFromToken(req)

		const sub = await getCognitoId(req)
		if (sub) {
			const swimmingLoggedUser = await SwimmingLoggedUser.findOne({
				attributes: [
					'id',
					'externalAzureId',
					'externalCognitoId',
					'age',
					'zip',
					'createdAt',
					'updatedAt',
					'deletedAt',
				],
				where: {
					externalCognitoId: { [Op.eq]: sub },
				},
				include: [
					{
						association: 'image',
						attributes: [
							'id',
							'name',
							'originalPath',
							'mimeType',
							'size',
							'relatedId',
							'relatedType',
						],
					},
				],
			})

			let swimmingLoggedUserWithImageBase64 = {
				...formatSwimmingLoggedUser(swimmingLoggedUser),
				image: swimmingLoggedUser.image
					? await readAsBase64(swimmingLoggedUser.image)
					: null,
			}

			return res.json({
				...swimmingLoggedUserWithImageBase64,
				...loggedUser,
				// pagination: {
				// 	page: query.page,
				// 	limit: query.limit,
				// 	totalPages: Math.ceil(count / limit) || 0,
				// 	totalCount: count,
				// },
			})
		}
	} catch (err) {
		return next(err)
	}
}
