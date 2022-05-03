import Joi from 'joi'
import { NextFunction, Request, Response } from 'express'


export const schema = Joi.object()

export const workflow = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { query }: any = req

		console.log(query)

		return res.json(null)
	} catch (err) {
		return next(err)
	}
}
