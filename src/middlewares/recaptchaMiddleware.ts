import { Request, Response, NextFunction } from 'express'
import config from 'config'
import { IGoogleServiceConfig } from '../types/interfaces'
import ErrorBuilder from '../utils/ErrorBuilder'
import axios from 'axios'

const googleServiceConfig: IGoogleServiceConfig = config.get('googleService')

export default async (req: Request, _res: Response, next: NextFunction) => {
	try {
		// const recaptchaResponse = req.body.recaptcha

		// const response = await axios({
		// 	method: 'POST',
		// 	url: 'https://recaptchaenterprise.googleapis.com/v1beta1/projects/kupaliska/assessments?key=AIzaSyBylFCQ0PBYSTjdwxOjtIvA6K7Cv7xBZjg',
		// 	headers: { 'Content-Type': 'application/json' },
		// 	data: {
		// 		event: {
		// 			siteKey: googleServiceConfig.recaptcha.clientSecret,
		// 			token: recaptchaResponse,
		// 			expectedAction: "order"
		// 		}
		// 	}
		//   })

		// if (response.status !== 200 || response.data.score < 0.5) {
		// 	console.log(response.data.tokenProperties.invalidReason)
		// 	console.log(response.data.reasons)
		// 	throw new ErrorBuilder(400, req.t('error:invalidRecaptcha'))
		// }
		return next()
	} catch (err) {
		return next(err)
	}
}
