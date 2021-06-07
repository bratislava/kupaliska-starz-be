import { formatTicketType } from './../../../utils/formatters';
import Joi from 'joi'
import { Op } from 'sequelize'
import { NextFunction, Request, Response } from 'express'
import { models } from '../../../db/models'
import ErrorBuilder from '../../../utils/ErrorBuilder'

const {
	TicketType,
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

		const ticketType = await TicketType.findOne({
			attributes: [
				'id',
				'name',
				'description',
				'price',
				'type',
				'nameRequired',
				'photoRequired',
				'childrenAllowed',
				'childrenMaxNumber',
				'childrenPrice',
				'childrenAgeFrom',
				'childrenAgeTo',
				'childrenAgeToWithAdult',
				'childrenPhotoRequired',
				'entriesNumber',
				'hasEntranceConstraints',
				'entranceFrom',
				'entranceTo',
				'hasTicketDuration',
				'ticketDuration',
				'validFrom',
				'validTo',
				'createdAt',
			],
			where: {
				id: { [Op.eq]: params.ticketTypeId }
			},
			include: { association: 'swimmingPools'}
		})

		if (!ticketType) {
			throw new ErrorBuilder(404, req.t('error:ticketTypeNotFound'))
		}

		return res.json(formatTicketType(ticketType))
	} catch (err) {
		return next(err)
	}
}
