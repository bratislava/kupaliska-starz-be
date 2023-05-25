import Joi from 'joi'
import { Op } from 'sequelize'
import { NextFunction, Request, Response } from 'express'
import ErrorBuilder from '../../../utils/ErrorBuilder'
import logger from '../../../utils/logger'
import { models } from '../../../db/models'
import { createPass } from '../../../services/appleWalletService'

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
			attributes: ['id', 'remainingEntries'],
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
		res.header('Content-Type', 'application/vnd.apple.pkpass')
		res.attachment('ticket.pkpass')
		return res.send(
			await createPass(
				ticket.id,
				ticket.ticketType.name,
				// ticket.ticketType.isDisposable is unreliable in multi-entry tickets for the following
				ticket.remainingEntries != null
					? undefined
					: ticket.profile.name
			)
		)
	} catch (err) {
		// extra logging just in case
		logger.error('Error Apple Wallet request failed')
		logger.error(err)
		return next(err)
	}
}