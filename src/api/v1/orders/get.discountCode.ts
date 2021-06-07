import Joi from 'joi'
import { NextFunction, Request, Response } from 'express'
import ErrorBuilder from '../../../utils/ErrorBuilder'
import { getDiscountCode } from '../../../services/discountCodeValidationService'

export const schema = Joi.object().keys({
	body: Joi.object(),
	query: Joi.object(),
	params: Joi.object().keys({
		ticketTypeId: Joi.string().guid({ version: ['uuidv4'] }).required(),
		code: Joi.string().required().min(5).max(20)
	})
})

export const workflow = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { params } = req

		const discountCode = await getDiscountCode( params.code, params.ticketTypeId)

		if (!discountCode) {
			throw new ErrorBuilder(404, req.t('error:discountCodeNotValid'))
		}

		return res.json({
			discountCode: {
				code: discountCode.code,
				amount: discountCode.amount
			}
		})
	} catch (err) {
		return next(err)
	}
}


