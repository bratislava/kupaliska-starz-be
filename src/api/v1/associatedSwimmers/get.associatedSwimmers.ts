import Joi from 'joi'
import { NextFunction, Request, Response } from 'express'
import { Op } from 'sequelize'
import { map } from 'lodash'

import { models } from '../../../db/models'
import { formatAssociatedSwimmer } from '../../../utils/formatters'
import { getDataAboutCurrentUser } from '../../../utils/getDataCurrentUser'
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

const { AssociatedSwimmer } = models

export const workflow = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	try {
		const swimmingLoggedUser = await getDataAboutCurrentUser(req)
		const associatedSwimmers = await AssociatedSwimmer.findAll({
			attributes: [
				'id',
				'swimmingLoggedUserId',
				'firstname',
				'lastname',
				'age',
				'zip',
				'createdAt',
				'updatedAt',
				'deletedAt',
			],
			where: {
				// TODO admin should see all associatedSwimmers
				swimmingLoggedUserId: {
					[Op.eq]: swimmingLoggedUser.id,
				},
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

		let associatedSwimmersWithImageBase64 = await Promise.all(
			map(associatedSwimmers, async (associatedSwimmer) => {
				return {
					...formatAssociatedSwimmer(associatedSwimmer),
					image: associatedSwimmer.image
						? await readAsBase64(associatedSwimmer.image)
						: null,
				}
			})
		)

		return res.json({
			associatedSwimmers: associatedSwimmersWithImageBase64,
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
