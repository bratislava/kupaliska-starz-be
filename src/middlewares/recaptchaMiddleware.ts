import { Request, Response, NextFunction } from 'express'
import config from 'config'
import axios from 'axios'
import { IGoogleServiceConfig } from '../types/interfaces'
import ErrorBuilder from '../utils/ErrorBuilder'

const googleServiceConfig: IGoogleServiceConfig = config.get('googleService')

export default async (req: Request, _res: Response, next: NextFunction) => {
	try {
		console.log('BODY: ', req.body);
		const recaptchaResponse = req.body.recaptcha
		const response = await axios({
			method: 'POST',
			url: 'https://recaptchaenterprise.googleapis.com/v1beta1/projects/kupaliska/assessments?key=AIzaSyBylFCQ0PBYSTjdwxOjtIvA6K7Cv7xBZjg',
			headers: { 'Content-Type': 'application/json' },
			data: {
				event: {
					siteKey: googleServiceConfig.recaptcha.clientSecret,
					token: recaptchaResponse,
					expectedAction: 'order',
				},
			},
		}).then(response => {
			return response
		 })
		 .catch(error => {
			return error.response
		 })

		// console.log(response);
		if (response.status !== 200) {
			console.log(response.status)
			console.log(response.data)
			throw new ErrorBuilder(400, req.t('error:Recaptcha request error'))
		} else if (response.data.score < 0.5) {
			// console.log(response.data);
			console.log(response.data.tokenProperties.invalidReason)
			console.log(response.data.reasons)
			throw new ErrorBuilder(400, req.t('error:invalidRecaptcha'))
		} else if (response.data.score >= 0.5){
			// console.log(response.data);
			console.log('Presla recaptcha')
			return next()
		}
		else {
			// console.log(response.data);
			throw new ErrorBuilder(400, req.t('error:invalidRecaptcha'))
		}
		
	} catch (err) {
		console.log(err)
		return next(err)
	}
}
