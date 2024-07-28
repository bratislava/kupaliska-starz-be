import Joi from 'joi'
import { Op } from 'sequelize'
import { NextFunction, Request, Response } from 'express'
import ErrorBuilder from '../../../utils/ErrorBuilder'
import logger from '../../../utils/logger'
import { models } from '../../../db/models'
import { getPassUrl } from '../../../services/googlePayService'

const { Ticket } = models

export const schema = Joi.object().keys({
	body: Joi.object(),
	query: Joi.object(),
	params: Joi.object().keys({
		ticketId: Joi.string()
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
		const ticket = await Ticket.findOne({
			where: {
				id: { [Op.eq]: params.ticketId },
			},
			include: [
				{
					association: 'profile',
				},
				{
					association: 'ticketType',
					paranoid: false,
				},
			],
		})

		if (!ticket) {
			throw new ErrorBuilder(404, req.t('error:ticketNotFound'))
		}
		return res.redirect(await getPassUrl(ticket))
	} catch (err) {
		// extra logging just in case
		logger.error('Error Google Wallet request failed')
		logger.error(err)
		return next(err)
	}
}
