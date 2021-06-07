import { formatTicketType } from './../../../utils/formatters';
import Joi from 'joi'
import { NextFunction, Request, Response } from 'express'
import DB, { models } from '../../../db/models'
import { MESSAGE_TYPE } from '../../../utils/enums'
import ErrorBuilder from '../../../utils/ErrorBuilder'
import { map } from 'lodash';
import { Op, Transaction } from 'sequelize';

export const ticketTypePutSchema = {
	name: Joi.string().max(255).required(),
	description: Joi.string().allow(null),
	price: Joi.number().min(0).precision(2).required(),
	nameRequired: Joi.boolean().required(),
	photoRequired: Joi.boolean().required(),
	validFrom: Joi.date().required(),
	validTo: Joi.date().min(Joi.ref('validFrom')).required(),
	swimmingPools: Joi.array().min(1).items(
		Joi.string().guid({ version: ['uuidv4'] }).required()
	).required()
}

export const schema = Joi.object().keys({
	body: Joi.object().keys(ticketTypePutSchema),
	query: Joi.object(),
	params: Joi.object().keys({
		ticketTypeId: Joi.string().guid({ version: ['uuidv4'] }).required()
	})
})

export const workflow = async (req: Request, res: Response, next: NextFunction) => {

	const {
		TicketType,
		SwimmingPool,
		SwimmingPoolTicketType
	} = models

	let transaction: Transaction
	try {
		const { body, params } = req

		const ticketType = await TicketType.findByPk(params.ticketTypeId,
			{
				include: { association: 'swimmingPools' }
			})
		if (!ticketType) {
			throw new ErrorBuilder(404, req.t('error:ticketTypeNotFound'))
		}

		const swimmingPools = await SwimmingPool.findAll({
			where: {
				id: {
					[Op.in]: body.swimmingPools
				}
			}
		})
		if (swimmingPools.length !== body.swimmingPools.length) {
			throw new ErrorBuilder(400, req.t('error:incorrectSwimmingPools'))
		}

		transaction = await DB.transaction()

		await ticketType.update(body, { transaction })

		await SwimmingPoolTicketType.destroy({
			where: {
				ticketTypeId: {
					[Op.eq]: ticketType.id
				}
			},
			transaction
		})
		await SwimmingPoolTicketType.bulkCreate(map(body.swimmingPools, (poolId) => ({
			swimmingPoolId: poolId,
			ticketTypeId: ticketType.id
		})), { transaction })

		await transaction.commit()
		transaction = null

		await ticketType.reload({ include: { association: 'swimmingPools' } })

		return res.json({
			data: {
				id: ticketType.id,
				ticketType: formatTicketType(ticketType)
			},
			messages: [{
				type: MESSAGE_TYPE.SUCCESS,
				message: req.t('success:admin.ticketTypes.updated')
			}]
		})

	} catch (err) {
		if (transaction) {
			await transaction.rollback()
		}
		return next(err)
	}
}
