import { ENTRY_TYPE } from '../../../utils/enums';
import Joi from 'joi'
import { QueryTypes } from 'sequelize'
import { NextFunction, Request, Response } from 'express'
import sequelize from '../../../db/models'

export const schema = Joi.object().keys({
	body: Joi.object(),
	query: Joi.object(),
	params: Joi.object().keys({
		swimmingPoolId: Joi.string().guid({ version: ['uuidv4'] }).required()
	})
})

export const workflow = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { params } = req

		const currentVisits = await sequelize.query<{ count: number }>(`
			SELECT COUNT(*)
			FROM tickets
			WHERE EXISTS
				(
					SELECT *
					FROM (
						SELECT *
						FROM entries
						WHERE
							cast(timestamp as DATE) = CURRENT_DATE
							AND
							"ticketId" = tickets.id
							AND
							"swimmingPoolId" = $swimmingPoolId
						ORDER BY timestamp desc
						LIMIT 1
					) as "lastEntry"
					WHERE
						"lastEntry".type = $entryType
				)`,
			{
				bind: {
					swimmingPoolId: params.swimmingPoolId,
					entryType: ENTRY_TYPE.CHECKIN
				},
				raw: true,
				plain: true,
				type: QueryTypes.SELECT,
			}
		)

		return res.json({
			numberOfCurrentVisits: currentVisits.count
		})

	} catch (err) {
		return next(err)
	}
}
