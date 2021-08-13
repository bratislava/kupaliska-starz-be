import { Request, NextFunction, Response } from 'express'
import { isEmpty } from 'lodash'
import util from 'util'

// utils
import ErrorBuilder from '../utils/ErrorBuilder'
import { MESSAGE_TYPE } from '../utils/enums'
import logger from '../utils/logger'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default (err: ErrorBuilder, req: Request, res: Response, _next: NextFunction) => {
	if (req.app.get('env') === 'development') {
		// eslint-disable-next-line no-console
		console.log(err)
	}

	// if status does not exist, assign 500
	const errStatus = err.status || 500

	let messages
	if (errStatus < 500) {
		if (err.isJoi || !isEmpty(err.items)) {
			messages = err.items
		} else {
			messages = [err.message]
		}
	} else {
		logger.error(`${500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`)
		logger.error(`stack: ${JSON.stringify(util.inspect(err.stack))} \n`)

		messages = [{
			message: req.t('error:genericError'),
			type: MESSAGE_TYPE.ERROR
		}]
	}

	// render the error page
	return res.status(errStatus).json({ messages })
}
