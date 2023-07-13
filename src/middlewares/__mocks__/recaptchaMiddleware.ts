import { NextFunction, Request, Response } from 'express'

export default async (req: Request, _res: Response, next: NextFunction) =>
	next()
