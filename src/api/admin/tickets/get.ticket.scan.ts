import Joi from 'joi'
import { Op } from 'sequelize'
import { NextFunction, Request, Response } from 'express'
import { models } from '../../../db/models'
import ErrorBuilder from '../../../utils/ErrorBuilder'
import { EntryModel } from '../../../db/models/entry';
import { validateCheckin, validateCheckout } from '../../../services/ticketValidationService';
import { last } from 'lodash'
import readAsBase64 from '../../../utils/reader'

const {
	Ticket, File, SwimmingLoggedUser
} = models

export const schema = Joi.object().keys({
	body: Joi.object(),
	query: Joi.object(),
	params: Joi.object().keys({
		swimmingPoolId: Joi.string().guid({ version: ['uuidv4'] }).required(),
	})
})

export const workflow = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { params } = req
		const authInfo = req.authInfo as { ticketId: string }

		const ticket = await Ticket.findOne({
			attributes: [
				'id',
				'isChildren',
				'remainingEntries'
			],
			where: {
				id: { [Op.eq]: authInfo.ticketId }
			},
			include: [
				{
					association: 'order', attributes: ['id', 'state'],
				},
				{
					association: 'profile',
					include: [
						{ association: 'photo' }
					]
				},
				{
					association: 'ticketType', paranoid: false,
					include: [
						{ association: 'swimmingPools', attributes: ['id'] }
					]
				},
				{
					association: 'entries',
					model: EntryModel.scope([{ method: ['timestamp'] }, 'manual']),
					separate: true,
					order: [['timestamp', 'asc']],
					include: [
						{
							association: 'swimmingPool', attributes: ['id', 'name'],
							paranoid: false
						}
					]
				},

			]
		})

		if (!ticket) {
			throw new ErrorBuilder(404, req.t('error:ticketNotFound'))
		}

		const checkinTicketErrorBuilder = validateCheckin(ticket, params.swimmingPoolId)
		const checkoutTicketErrorBuilder = validateCheckout(ticket, params.swimmingPoolId)
		const lastEntry = last(ticket.entries)

		let relatedId = ""
		if (ticket.associatedSwimmerId) {
			relatedId = ticket.associatedSwimmerId
		} else { 
			const loggedUser = await SwimmingLoggedUser.findOne({where: {externalId: ticket.loggedUserId}})
			relatedId = loggedUser.id;
		}

		const file = await File.findOne({where: {relatedId: relatedId}})

		return res.json({
			ticket: {
				id: ticket.id,
				isChildren: ticket.isChildren,
				email: ticket.profile.email,
				name: ticket.profile.name,
				age: ticket.profile.age,
				zip: ticket.profile.zip,
				photo: file ? await readAsBase64(file) : null,
				remainingEntries: ticket.remainingEntries
			},
			ticketType: {
				name: ticket.ticketType.name,
				type: ticket.ticketType.type,
				nameRequired: ticket.ticketType.nameRequired,
				photoRequired: ticket.ticketType.photoRequired,
				hasEntranceConstraints: ticket.ticketType.hasEntranceConstraints,
				entranceFrom: ticket.ticketType.entranceFrom,
				entranceTo: ticket.ticketType.entranceTo,
				hasTicketDuration: ticket.ticketType.hasTicketDuration,
				ticketDuration: ticket.ticketType.ticketDuration,
				childrenAgeToWithAdult: ticket.ticketType.childrenAgeToWithAdult,
				validFrom: ticket.ticketType.validFrom,
				validTo: ticket.ticketType.validTo,
			},
			lastEntry: lastEntry ? {
				timestamp: lastEntry.timestamp,
				type: lastEntry.type,
				swimmingPoolId: lastEntry.swimmingPool.id,
				swimmingPoolName: lastEntry.swimmingPool.name
			} : null,
			checkIn: {
				status: checkinTicketErrorBuilder.getStatus(),
				messages: checkinTicketErrorBuilder.getErrors()
			},
			checkOut: {
				status: checkoutTicketErrorBuilder.getStatus(),
				messages: checkoutTicketErrorBuilder.getErrors()
			}

		})
	} catch (err) {
		return next(err)
	}
}
