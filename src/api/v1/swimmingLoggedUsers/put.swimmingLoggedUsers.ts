import Joi from 'joi'
import { NextFunction, Request, Response } from 'express'
import { Op, Transaction } from 'sequelize'
import sequelize, { models } from '../../../db/models'
import ErrorBuilder from '../../../utils/ErrorBuilder'
import { getCognitoIdOfLoggedInUser } from '../../../utils/azureAuthentication'
import { formatSwimmingLoggedUser } from '../../../utils/formatters'
import { MESSAGE_TYPE } from '../../../utils/enums'
import { uploadImage } from '../../../utils/imageUpload'
import { SwimmingLoggedUserModel } from '../../../db/models/swimmingLoggedUser'
import readAsBase64 from '../../../utils/reader'
import { calculateAge } from '../../../utils/helpers'

export const swimmingLoggedUserUploadFolder = 'private/swimming-logged-user'
export const schema = Joi.object().keys({
	body: Joi.object().keys({
		dateOfBirth: Joi.date(),
		zip: Joi.string().allow(null, ''),
		// TODO uncomment once we give feedback on error on FE
		// .pattern(
		// 	new RegExp('^\\s*(\\d\\s*\\d\\s*\\d\\s*\\d\\s*\\d)?\\s*$')
		// ),
		image: Joi.string(),
	}),
	query: Joi.object(),
	params: Joi.object(),
})

const { SwimmingLoggedUser } = models

export const workflow = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	let transaction: Transaction | null = null
	try {
		const { body } = req
		const sub = await getCognitoIdOfLoggedInUser(req)
		if (sub) {
			const swimmingLoggedUser = await SwimmingLoggedUser.findOne({
				attributes: [
					'id',
					'externalCognitoId',
					'age',
					'dateOfBirth',
					'zip',
					'dateOfBirth',
				],
				where: {
					externalCognitoId: { [Op.eq]: sub },
				},
				include: [{ association: 'image' }],
			})

			if (!swimmingLoggedUser) {
				throw new ErrorBuilder(404, req.t('error:userNotFound'))
			}
			transaction = await sequelize.transaction()
			const age = calculateAge(body.dateOfBirth)
			await swimmingLoggedUser.update(
				{
					dateOfBirth: body.dateOfBirth
						? body.dateOfBirth
						: swimmingLoggedUser.dateOfBirth,
					age: age ? age : swimmingLoggedUser.age,
					zip: body.zip ? body.zip : swimmingLoggedUser.zip,
				},
				{ transaction }
			)
			if (body.image) {
				await uploadImage(
					req,
					body.image,
					swimmingLoggedUser.id,
					SwimmingLoggedUserModel.name,
					swimmingLoggedUserUploadFolder,
					transaction,
					swimmingLoggedUser.image
						? swimmingLoggedUser.image.id
						: undefined
				)
			}

			await transaction.commit()
			await swimmingLoggedUser.reload({
				include: [{ association: 'image' }],
			})
			transaction = null

			let swimmingLoggedUserWithImageBase64 = {
				...formatSwimmingLoggedUser(swimmingLoggedUser),
				image: swimmingLoggedUser.image
					? await readAsBase64(swimmingLoggedUser.image)
					: null,
			}

			return res.json({
				data: {
					id: swimmingLoggedUser.id,
					swimmingLoggedUser: swimmingLoggedUserWithImageBase64,
				},
				messages: [
					{
						type: MESSAGE_TYPE.SUCCESS,
						message: req.t(
							'success:loggedSwimmer.swimmingLoggedUsers.updated'
						),
					},
				],
			})
		} else {
			throw new ErrorBuilder(401, req.t('error:ticket.userNotFound'))
		}
	} catch (err) {
		if (transaction) transaction.rollback()
		return next(err)
	}
}
