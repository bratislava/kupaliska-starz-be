import Joi from 'joi'
import { Request, Response, NextFunction } from 'express'
import { MESSAGE_TYPE } from '../../../utils/enums'
import { models } from '../../../db/models'
import ErrorBuilder from '../../../utils/ErrorBuilder'
import { getDataAboutCurrentUser } from '../../../utils/getDataCurrentUser'

const { AssociatedSwimmer } = models

export const schema = Joi.object().keys({
	body: Joi.object(),
	query: Joi.object(),
	params: Joi.object().keys({
		associatedSwimmerId: Joi.string()
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

		let swimmingLoggedUser = await getDataAboutCurrentUser(req)

		const associatedSwimmer = await AssociatedSwimmer.findByPk(
			params.associatedSwimmerId
		)

		if (!associatedSwimmer) {
			// TODO error translation
			throw new ErrorBuilder(
				404,
				req.t('error:associatedSwimmerNotFound')
			)
		}
		if (associatedSwimmer.swimmingLoggedUserId === swimmingLoggedUser.id) {
			await associatedSwimmer.destroy()

			return res.json({
				data: {},
				messages: [
					{
						type: MESSAGE_TYPE.SUCCESS,
						message: req.t(
							// TODO error translation
							'success:loggedSwimmer.associatedSwimmer.deleted'
						),
					},
				],
			})
		}
	} catch (err) {
		return next(err)
	}
}
