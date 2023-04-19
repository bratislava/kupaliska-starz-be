import Joi from 'joi'
import { Request, Response, NextFunction } from 'express'
import { MESSAGE_TYPE } from '../../../utils/enums'
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

		const discountCode = await DiscountCode.findByPk(params.discountCodeId)

		if (!discountCode) {
			throw new ErrorBuilder(404, req.t('error:discountCodeNotFound'))
		}

		await discountCode.destroy()

		return res.json({
			data: {},
			messages: [
				{
					type: MESSAGE_TYPE.SUCCESS,
					message: req.t('success:admin.discountCodes.deleted'),
				},
			],
		})
	} catch (err) {
		return next(err)
	}
}
