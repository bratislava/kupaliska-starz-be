import { DiscountCodeTicketTypeModel } from './../../../db/models/discountCodeTicketType'
import { formatDiscountCode } from '../../../utils/formatters'
import Joi from 'joi'
import { NextFunction, Request, Response } from 'express'
import { Op, Transaction } from 'sequelize'
import { MESSAGE_TYPE } from '../../../utils/enums'
import DB, { models } from '../../../db/models'
import { isEmpty, map } from 'lodash'
import { generateDiscountCode } from '../../../utils/discountCodeGenerator'
import ErrorBuilder from '../../../utils/ErrorBuilder'

export const discountCodeAddSchema = {
	quantity: Joi.number().integer().required().min(1),
	amount: Joi.number().precision(2).greater(0).max(100).required(),
	validFrom: Joi.date().required(),
	validTo: Joi.date().min(Joi.ref('validFrom')).required(),
	ticketTypes: Joi.array()
		.min(1)
		.required()
		.items(
			Joi.string()
				.guid({ version: ['uuidv4'] })
				.required()
		),
}

export const schema = Joi.object().keys({
	body: Joi.object().keys(discountCodeAddSchema),
	query: Joi.object(),
	params: Joi.object(),
})

const { DiscountCode, TicketType } = models

export const workflow = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	let transaction: Transaction
	try {
		const { body } = req

		transaction = await DB.transaction()

		if (!isEmpty(body.ticketTypes)) {
			const ticketTypes = await TicketType.findAll({
				where: {
					id: {
						[Op.in]: body.ticketTypes,
					},
				},
			})
			if (ticketTypes.length !== body.ticketTypes.length) {
				throw new ErrorBuilder(
					400,
					req.t('error:incorrectTicketTypes'),
					'incorrectTicketTypes'
				)
			}
		}

		const existingCodes = map(
			await DiscountCode.findAll({
				paranoid: false,
				attributes: ['code'],
			}),
			(code) => code.code
		)

		const discountCodes = await DiscountCode.bulkCreate(
			map([...Array(body.quantity).keys()], () => {
				const code = generateDiscountCode(existingCodes)
				existingCodes.push(code)

				return {
					code: code,
					amount: body.amount,
					validFrom: body.validFrom,
					validTo: body.validTo,
				}
			}),
			{ transaction }
		)

		const discountCodeTicketTypes = []
		for (const code of discountCodes) {
			for (const ticketTypeId of body.ticketTypes) {
				discountCodeTicketTypes.push({
					ticketTypeId: ticketTypeId,
					discountCodeId: code.id,
				})
			}
		}

		await DiscountCodeTicketTypeModel.bulkCreate(discountCodeTicketTypes, {
			transaction,
		})

		await transaction.commit()
		transaction = null

		const discountCodesIds = map(discountCodes, (code) => code.id)

		const createdDiscountCodes = await DiscountCode.findAll({
			where: {
				id: {
					[Op.in]: discountCodesIds,
				},
			},
			include: {
				association: 'ticketTypes',
			},
		})

		return res.json({
			data: {
				discountCodes: map(createdDiscountCodes, (discountCode) =>
					formatDiscountCode(discountCode)
				),
			},
			messages: [
				{
					type: MESSAGE_TYPE.SUCCESS,
					message: req.t('success:admin.discountCodes.created'),
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
