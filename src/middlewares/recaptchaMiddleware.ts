import { Request, Response, NextFunction } from "express";
import config from "config";
import axios from "axios";
import formUrlEncoded from "form-urlencoded";
import { IGoogleServiceConfig } from "../types/interfaces";
import ErrorBuilder from "../utils/ErrorBuilder";

const googleServiceConfig: IGoogleServiceConfig = config.get("googleService");

export default async (req: Request, _res: Response, next: NextFunction) => {
	try {
		const recaptchaResponse = req.body.recaptcha;

		console.log(recaptchaResponse);
		console.log(googleServiceConfig.recaptcha);

		const response = await axios({
			method: "POST",
			url: "https://www.google.com/recaptcha/api/siteverify",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			data: formUrlEncoded({
				secret: googleServiceConfig.recaptcha.clientSecret,
				response: recaptchaResponse,
			}),
		});

		console.log(response);

		if (response.status !== 200 || response.data.success !== true) {
			throw new ErrorBuilder(400, req.t("error:invalidRecaptcha"));
		}
		return next();
	} catch (err) {
		return next(err);
	}
};
