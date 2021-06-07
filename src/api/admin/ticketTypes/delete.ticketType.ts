import Joi from 'joi'
import { Request, Response, NextFunction } from 'express'
import { MESSAGE_TYPE } from '../../../utils/enums'
import { models } from '../../../db/models'
import ErrorBuilder from '../../../utils/ErrorBuilder'

const {
	TicketType
} = models

export const schema = Joi.object().keys({
	body: Joi.object(),
	query: Joi.object(),
	params: Joi.object().keys({
		ticketTypeId: Joi.string().guid({version: ['uuidv4']}).required()
	})
})

export const workflow = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { params } = req

		const ticketType = await TicketType.findByPk(params.ticketTypeId)

		if (!ticketType) {
			throw new ErrorBuilder(404, req.t('error:ticketTypeNotFound'))
		}

		await ticketType.destroy()

		return res.json({
			data: {},
			messages: [{
				type: MESSAGE_TYPE.SUCCESS,
				message: req.t('success:admin.ticketTypes.deleted')
			}]
		})
	} catch (err) {
		return next(err)
	}
}
