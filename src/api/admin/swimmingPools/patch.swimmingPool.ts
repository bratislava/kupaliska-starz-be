import { UserModel } from './../../../db/models/user'
import Joi from 'joi'
import { NextFunction, Request, Response } from 'express'
import DB, { models } from '../../../db/models'
import { MESSAGE_TYPE } from '../../../utils/enums'
import ErrorBuilder from '../../../utils/ErrorBuilder'
import {
	maxFileSize,
	swimmingPoolUploadFolder,
	validExtensions,
} from './post.swimmingPool'
import { Transaction } from 'sequelize'
import uploadFileFromBase64, { removeFile } from '../../../utils/uploader'
import { validBase64 } from '../../../utils/validation'
import { SwimmingPoolModel } from '../../../db/models/swimmingPool'
import { formatSwimmingPool } from '../../../utils/formatters'

export const baseSchema = {
	query: Joi.object(),
	params: Joi.object().keys({
		swimmingPoolId: Joi.string()
			.guid({ version: ['uuidv4'] })
			.required(),
	}),
}

export const swimmingPoolOperatorPatchSchema = Joi.object().keys({
	body: Joi.object().keys({
		waterTemp: Joi.number(),
		maxCapacity: Joi.number(),
		openingHours: Joi.array(),
	}),
	...baseSchema,
})

export const operatorPatchSchema = Joi.object().keys({
	body: Joi.object().keys({
		name: Joi.string().max(500),
		image: Joi.object().keys({
			base64: Joi.string()
				.custom(validBase64(maxFileSize, validExtensions))
				.required(),
			altText: Joi.string().max(500),
		}),
		description: Joi.string().max(1000),
		expandedDescription: Joi.string(),
		waterTemp: Joi.number(),
		maxCapacity: Joi.number().min(0),
		openingHours: Joi.array(),
		facilities: Joi.array().items(Joi.string()),
		locationUrl: Joi.string().max(1000).uri(),
		ordering: Joi.number().integer().min(1).default(0),
	}),
	...baseSchema,
})

const { SwimmingPool, File } = models

export const workflow = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	let transaction: Transaction
	try {
		const { body, params } = req
		const user = req.user as UserModel

		const swimmingPool = await SwimmingPool.findByPk(
			params.swimmingPoolId,
			{ include: { association: 'image' } }
		)

		if (!swimmingPool) {
			throw new ErrorBuilder(404, req.t('error:swimmingPoolNotFound'))
		}

		transaction = await DB.transaction()
		const { image, ...data } = body

		await swimmingPool.update(data, { transaction })

		if (image) {
			await changeImage(
				swimmingPool,
				req,
				image,
				swimmingPool.id,
				transaction
			)
		}

		await transaction.commit()
		await swimmingPool.reload({ include: [{ association: 'image' }] })

		transaction = null

		return res.json({
			data: {
				id: swimmingPool.id,
				swimmingPool: formatSwimmingPool(swimmingPool, user.role),
			},
			messages: [
				{
					type: MESSAGE_TYPE.SUCCESS,
					message: req.t('success:admin.swimmingPools.updated'),
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

const changeImage = async (
	swimmingPool: SwimmingPoolModel,
	req: Request,
	image: { base64: string; altText: string },
	swimmingPoolId: string,
	transaction: any
) => {
	// Upload new image, upload model and then remove old
	const file = await uploadFileFromBase64(
		req,
		image.base64,
		swimmingPoolUploadFolder
	)

	let oldFilename
	if (swimmingPool.image) {
		oldFilename = swimmingPool.image.name
	}

	await File.upsert(
		{
			id: swimmingPool.image ? swimmingPool.image.id : undefined,
			name: file.fileName,
			originalPath: file.filePath,
			mimeType: file.mimeType,
			altText: image.altText || '',
			size: file.size,
			relatedId: swimmingPoolId,
			relatedType: 'swimmingPool',
		},
		{ transaction }
	)

	if (swimmingPool.image) {
		await removeFile(oldFilename, swimmingPoolUploadFolder)
	}
}
