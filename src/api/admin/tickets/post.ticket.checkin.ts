import { ENTRY_FLAG, ENTRY_TYPE, CHECK_STATUS } from '../../../utils/enums'
import Joi from 'joi'
import { Op } from 'sequelize'
import { NextFunction, Request, Response } from 'express'
import sequelize, { models } from '../../../db/models'
import ErrorBuilder from '../../../utils/ErrorBuilder'
import { UserModel } from '../../../db/models/user'
import { EntryModel } from '../../../db/models/entry'
import { find } from 'lodash'
import { validateCheckin } from '../../../services/ticketValidationService'

const { Ticket, Entry } = models

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
	let transaction: any = null

	try {
		const { params } = req
		const authInfo = req.authInfo as { ticketId: string }
		const user = req.user as UserModel

		const ticket = await Ticket.findOne({
			attributes: ['id', 'remainingEntries'],
			where: {
				id: { [Op.eq]: authInfo.ticketId },
			},
			include: [
				{
					association: 'order',
					attributes: ['id', 'state'],
				},
				{
					association: 'ticketType',
					paranoid: false,
					include: [
						{ association: 'swimmingPools', attributes: ['id'] },
					],
				},
				{
					association: 'entries',
					model: EntryModel.scope([
						{ method: ['timestamp'] },
						'manual',
					]),
					separate: true,
					order: [['timestamp', 'asc']],
					attributes: ['id', 'timestamp', 'type'],
				},
			],
		})

		if (!ticket) {
			throw new ErrorBuilder(404, req.t('error:ticketNotFound'))
		}

		const checkinTicketErrorBuilder = validateCheckin(
			ticket,
			params.swimmingPoolId
		)

		if (checkinTicketErrorBuilder.getStatus() === CHECK_STATUS.OK) {
			transaction = await sequelize.transaction()

			const firstCheckInEntry = find(ticket.entries, (entry) =>
				entry.isCheckIn()
			)

			// IF FIRST CHECK-IN TODAY
			if (ticket.ticketType.isEntries && !firstCheckInEntry) {
				// decrement remaining entries
				await ticket.decrement('remainingEntries', { transaction })
			}

			await Entry.create(
				{
					type: ENTRY_TYPE.CHECKIN,
					flag: ENTRY_FLAG.MANUAL,
					ticketId: ticket.id,
					swimmingPoolId: params.swimmingPoolId,
					employeeId: user.id,
				},
				{ transaction }
			)

			await transaction.commit()
			transaction = null
		}

		return res.json({
			status: checkinTicketErrorBuilder.getStatus(),
			messages: checkinTicketErrorBuilder.getErrors(),
		})
	} catch (err) {
		if (transaction) {
			await transaction.rollback()
		}
		return next(err)
	}
}
