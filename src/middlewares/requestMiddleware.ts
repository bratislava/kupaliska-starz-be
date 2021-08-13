import { Request, Response, NextFunction } from 'express'
import logger from '../utils/logger'

export default (req: Request, res: Response, next: NextFunction) => {
	// Log when finishing, to show status code
	res.on('finish', () => {
		logger.http({
			body: req.body, url: req.url, method: req.method, status: res.statusCode,
		})
	})
	next()
}
