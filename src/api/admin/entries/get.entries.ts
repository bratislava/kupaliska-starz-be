import { Request, Response, NextFunction } from 'express'
import { models } from '../../../db/models'
import { ENTRY_TYPE } from '../../../utils/enums'

import Joi from 'joi'

export const schema = Joi.object().keys({
	body: Joi.object(),
	query: Joi.object(),
	params: Joi.object().keys({
		ticketId: Joi.string()
			.guid({ version: ['uuidv4'] })
			.required(),
	}),
})

const { Entry, SwimmingPool } = models

interface GetEntry {
	id: string
	poolName: string
	from: number
	to: number | null
}

export const workflow = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	try {
		const { params } = req

		const entries = await Entry.findAll({
			where: { ticketId: params.ticketId },
			order: [['timestamp', 'ASC']],
		})
		let result: GetEntry[] = []
		let entryResult: GetEntry | null = null
		for (const entry of entries) {
			if (entry.type === ENTRY_TYPE.CHECKIN) {
				if (entryResult) {
					result.push(entryResult)
					entryResult = null
				}
				const pool = await SwimmingPool.findByPk(entry.swimmingPoolId)
				entryResult = {
					id: entry.id,
					from: entry.timestamp.getTime(),
					to: null,
					poolName: pool.name,
				}
			} else if (entryResult && entry.type === ENTRY_TYPE.CHECKOUT) {
				entryResult.to = entry.timestamp.getTime()
				result.push(entryResult)
				entryResult = null
			}
		}
		if (entryResult) {
			result.push(entryResult)
			entryResult = null
		}
		return res.json(result.reverse())
	} catch (err) {
		return next(err)
	}
}
