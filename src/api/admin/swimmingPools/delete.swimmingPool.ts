import Joi from 'joi'
import { Request, Response, NextFunction } from 'express'
import { MESSAGE_TYPE } from '../../../utils/enums'
import { models } from '../../../db/models'
import ErrorBuilder from '../../../utils/ErrorBuilder'

const {
	SwimmingPool
} = models

export const schema = Joi.object().keys({
	body: Joi.object(),
	query: Joi.object(),
	params: Joi.object().keys({
		swimmingPoolId: Joi.string().guid({version: ['uuidv4']}).required()
	})
})

export const workflow = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { params } = req

		const swimmingPool = await SwimmingPool.findByPk(params.swimmingPoolId)

		if (!swimmingPool) {
			throw new ErrorBuilder(404, req.t('error:swimmingPoolNotFound'))
		}

		await swimmingPool.destroy()

		return res.json({
			data: {},
			messages: [{
				type: MESSAGE_TYPE.SUCCESS,
				message: req.t('success:admin.swimmingPools.deleted')
			}]
		})
	} catch (err) {
		return next(err)
	}
}
