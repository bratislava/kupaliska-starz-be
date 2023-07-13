import { formatDiscountCode } from '../../../utils/formatters'
import Joi from 'joi'
import { Op } from 'sequelize'
import { NextFunction, Request, Response } from 'express'
import { models } from '../../../db/models'
import ErrorBuilder from '../../../utils/ErrorBuilder'

const { DiscountCode } = models

export const schema = Joi.object().keys({
	body: Joi.object(),
	query: Joi.object(),
	params: Joi.object().keys({
		discountCodeId: Joi.string()
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

		const discountCode = await DiscountCode.unscoped().findOne({
			attributes: [
				'id',
				'code',
				'amount',
				'validFrom',
				'validTo',
				'createdAt',
				'usedAt',
			],
			where: {
				id: { [Op.eq]: params.discountCodeId },
			},
			include: [
				{
					association: 'ticketTypes',
				},
				{
					association: 'order',
					include: [
						{
							required: false,
							separate: true,
							association: 'tickets',
							limit: 1,
							where: {
								isChildren: {
									[Op.eq]: false,
								},
							},
							include: [
								{
									association: 'profile',
								},
							],
						},
					],
				},
			],
		})

		if (!discountCode) {
			throw new ErrorBuilder(404, req.t('error:discountCodeNotFound'))
		}

		return res.json(formatDiscountCode(discountCode))
	} catch (err) {
		return next(err)
	}
}
