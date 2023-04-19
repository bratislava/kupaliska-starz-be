import Joi from 'joi'

import { NextFunction, Request, Response } from 'express'
import { Op, Transaction } from 'sequelize'
import { TICKET_TYPE, MESSAGE_TYPE, TICKET_TYPES } from '../../../utils/enums'
import DB, { models } from '../../../db/models'
import { isEmpty, map } from 'lodash'
import ErrorBuilder from '../../../utils/ErrorBuilder'
import { formatTicketType } from '../../../utils/formatters'
import { joiCustomTimeRules } from '../../../utils/validation'

const JoiExtended = Joi.extend(joiCustomTimeRules())

export const ticketTypeAddSchema = {
	name: Joi.string().max(255).required(),
	description: Joi.string().allow(null),
	price: Joi.number().min(0).precision(2).required(),
	type: Joi.string()
		.uppercase()
		.valid(...TICKET_TYPES)
		.required(),
	nameRequired: Joi.boolean().required(),
	photoRequired: Joi.boolean().required(),
	swimmingPools: Joi.array()
		.min(1)
		.required()
		.items(
			Joi.string()
				.guid({ version: ['uuidv4'] })
				.required()
		),
	childrenAllowed: Joi.boolean().required(),
	childrenMaxNumber: Joi.number()
		.min(0)
		.max(100)
		.when('childrenAllowed', {
			is: true,
			then: Joi.required(),
			otherwise: Joi.forbidden(),
		}),
	childrenPrice: Joi.number()
		.min(0)
		.precision(2)
		.when('childrenAllowed', {
			is: true,
			then: Joi.required(),
			otherwise: Joi.forbidden(),
		}),
	childrenAgeFrom: Joi.number()
		.min(0)
		.max(150)
		.when('childrenAllowed', {
			is: true,
			then: Joi.required(),
			otherwise: Joi.forbidden(),
		}),
	childrenAgeTo: Joi.number()
		.min(0)
		.max(150)
		.when('childrenAllowed', {
			is: true,
			then: Joi.required(),
			otherwise: Joi.forbidden(),
		}),
	childrenAgeToWithAdult: Joi.number()
		.min(0)
		.max(150)
		.when('childrenAllowed', {
			is: true,
			then: Joi.required(),
			otherwise: Joi.forbidden(),
		}),
	childrenPhotoRequired: Joi.boolean().when('childrenAllowed', {
		is: true,
		then: Joi.required(),
		otherwise: Joi.forbidden(),
	}),
	validFrom: Joi.date().required(),
	validTo: Joi.date().min(Joi.ref('validFrom')).required(),
	entriesNumber: Joi.number()
		.min(0)
		.max(1000)
		.when('type', {
			is: Joi.valid(TICKET_TYPE.ENTRIES),
			then: Joi.required(),
			otherwise: Joi.forbidden(),
		}),
	hasTicketDuration: Joi.boolean()
		.required()
		.default(false)
		.when('hasEntranceConstraints', {
			is: true,
			then: Joi.boolean().valid(false),
		}),
	ticketDuration: JoiExtended.time().when('hasTicketDuration', {
		is: true,
		then: Joi.required(),
		otherwise: Joi.forbidden(),
	}),
	hasEntranceConstraints: Joi.boolean().required().default(false),
	entranceFrom: JoiExtended.time().when('hasEntranceConstraints', {
		is: true,
		then: Joi.required(),
		otherwise: Joi.forbidden(),
	}),
	entranceTo: JoiExtended.time()
		.minTime(Joi.ref('entranceFrom'))
		.when('hasEntranceConstraints', {
			is: true,
			then: Joi.required(),
			otherwise: Joi.forbidden(),
		}),
}

export const schema = Joi.object().keys({
	body: Joi.object().keys(ticketTypeAddSchema),
	query: Joi.object(),
	params: Joi.object(),
})

const { TicketType, SwimmingPoolTicketType, SwimmingPool } = models

export const workflow = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	let transaction: Transaction
	try {
		const { body } = req

		if (!isEmpty(body.swimmingPools)) {
			const swimmingPools = await SwimmingPool.findAll({
				where: {
					id: {
						[Op.in]: body.swimmingPools,
					},
				},
			})
			if (swimmingPools.length !== body.swimmingPools.length) {
				throw new ErrorBuilder(
					400,
					req.t('error:incorrectSwimmingPools'),
					'incorrectSwimmingPools'
				)
			}
		}

		transaction = await DB.transaction()

		const ticketType = await TicketType.create(
			{
				...body,
			},
			{ transaction }
		)

		if (!isEmpty(body.swimmingPools)) {
			await SwimmingPoolTicketType.bulkCreate(
				map(body.swimmingPools, (poolId) => ({
					swimmingPoolId: poolId,
					ticketTypeId: ticketType.id,
				})),
				{ transaction }
			)
		}

		await transaction.commit()
		await ticketType.reload({ include: { association: 'swimmingPools' } })
		transaction = null

		return res.json({
			data: {
				id: ticketType.id,
				ticketType: formatTicketType(ticketType),
			},
			messages: [
				{
					type: MESSAGE_TYPE.SUCCESS,
					message: req.t('success:admin.ticketTypes.created'),
				},
			],
		})
	} catch (err) {
		if (transaction) {
			await transaction.rollback()
		}
		return next(err)
	}
}
