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

const { AssociatedSwimmer, SwimmingLoggedUser } = models

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

				console.log({ body })

				const associatedSwimmer = await AssociatedSwimmer.create(
					{
						...body,
						swimmingLoggedUserId: swimmingLoggedUser.id,
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
								'success:loggedSwimmer.associatedSwimmer.created'
							),
						},
					],
				})
			}
		}
	} catch (err) {
		return next(err)
	}
}