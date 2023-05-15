import Joi from 'joi'
import { NextFunction, Request, Response } from 'express'
import { map } from 'lodash'

import { models } from '../../../db/models'
import { formatSwimmingLoggedUser } from '../../../utils/formatters'
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
		// TODO admin should get all if authenticated user get only myself

		const swimmingLoggedUsers = await SwimmingLoggedUser.findAll({
			attributes: [
				'id',
				'externalAzureId',
				'age',
				'zip',
				'createdAt',
				'updatedAt',
				'deletedAt',
			],
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

		let associatedSwimmersWithImageBase64 = await Promise.all(
			map(swimmingLoggedUsers, async (swimmingLoggedUser) => {
				return {
					...formatSwimmingLoggedUser(swimmingLoggedUser),
					image: swimmingLoggedUser.image
						? await readAsBase64(swimmingLoggedUser.image)
						: null,
				}
			})
		)

		return res.json({
			swimmingLoggedUser: associatedSwimmersWithImageBase64,
			// pagination: {
			// 	page: query.page,
			// 	limit: query.limit,
			// 	totalPages: Math.ceil(count / limit) || 0,
			// 	totalCount: count,
			// },
		})
	} catch (err) {
		return next(err)
	}
}
