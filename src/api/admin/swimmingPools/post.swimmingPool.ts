import { formatSwimmingPool } from './../../../utils/formatters'
import Joi from 'joi'
import { NextFunction, Request, Response } from 'express'
import { Transaction } from 'sequelize'
import { MESSAGE_TYPE, USER_ROLE } from '../../../utils/enums'
import DB, { models } from '../../../db/models'
import { validBase64 } from '../../../utils/validation'
import uploadFileFromBase64 from '../../../utils/uploader'

export const swimmingPoolUploadFolder = 'public/swimming-pools'
export const maxFileSize = 300 * 1024 // 300KB
export const validExtensions = ['png', 'jpg', 'jpeg']

export const swimmingPoolAddSchema = {
	name: Joi.string().max(500).required(),
	image: Joi.object()
		.required()
		.keys({
			base64: Joi.string()
				.custom(validBase64(maxFileSize, validExtensions))
				.required(),
			altText: Joi.string().max(500),
		}),
	description: Joi.string().max(1000).required(),
	expandedDescription: Joi.string().required(),
	waterTemp: Joi.number(),
	maxCapacity: Joi.number().min(0).required(),
	openingHours: Joi.array().required(),
	facilities: Joi.array().items(Joi.string()),
	locationUrl: Joi.string().max(1000).required().uri(),
	ordering: Joi.number().integer().min(1).default(0),
}

export const schema = Joi.object().keys({
	body: Joi.object().keys(swimmingPoolAddSchema),
	query: Joi.object(),
	params: Joi.object(),
})

const { SwimmingPool, File } = models

export const workflow = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	let transaction: Transaction
	try {
		const { body } = req

		transaction = await DB.transaction()

		const swimmingPool = await SwimmingPool.create(
			{
				name: body.name,
				description: body.description,
				expandedDescription: body.expandedDescription,
				waterTemp: body.waterTemp,
				maxCapacity: body.maxCapacity,
				openingHours: body.openingHours,
				facilities: body.facilities,
				locationUrl: body.locationUrl,
				ordering: body.ordering,
			},
			{ transaction }
		)

		const image = await uploadImage(
			req,
			body.image,
			swimmingPool.id,
			transaction
		)
		swimmingPool.image = image

		await transaction.commit()
		transaction = null

		return res.json({
			data: {
				id: swimmingPool.id,
				swimmingPool: formatSwimmingPool(
					swimmingPool,
					USER_ROLE.OPERATOR
				),
			},
			messages: [
				{
					type: MESSAGE_TYPE.SUCCESS,
					message: req.t('success:admin.swimmingPools.created'),
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

const uploadImage = async (
	req: Request,
	image: { base64: string; altText: string },
	swimmingPoolId: string,
	transaction: any
) => {
	const file = await uploadFileFromBase64(
		req,
		image.base64,
		swimmingPoolUploadFolder
	)
	return await File.create(
		{
			name: file.fileName,
			originalPath: file.filePath,
			mimeType: file.mimeType,
			altText: image.altText,
			size: file.size,
			relatedId: swimmingPoolId,
			relatedType: 'swimmingPool',
		},
		{ transaction }
	)
}
