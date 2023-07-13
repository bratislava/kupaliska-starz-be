import { formatSwimmingPool } from '../../../utils/formatters'
import Joi from 'joi'
import { Op } from 'sequelize'
import { NextFunction, Request, Response } from 'express'
import { models } from '../../../db/models'
import ErrorBuilder from '../../../utils/ErrorBuilder'

const { SwimmingPool } = models

export const schema = Joi.object().keys({
	body: Joi.object(),
	query: Joi.object(),
	params: Joi.object().keys({
		swimmingPoolId: Joi.string()
			.guid({ version: ['uuidv4'] })
			.required(),
	}),
})

export const workflow = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	try {
		const { params } = req

		const swimmingPool = await SwimmingPool.unscoped().findOne({
			attributes: [
				'id',
				'name',
				'description',
				'expandedDescription',
				'waterTemp',
				'maxCapacity',
				'facilities',
				'openingHours',
				'locationUrl',
				'ordering',
			],
			where: {
				id: { [Op.eq]: params.swimmingPoolId },
			},
			include: { association: 'image' },
		})

		if (!swimmingPool) {
			throw new ErrorBuilder(404, req.t('error:swimmingPoolNotFound'))
		}

		return res.json(formatSwimmingPool(swimmingPool))
	} catch (err) {
		return next(err)
	}
}
