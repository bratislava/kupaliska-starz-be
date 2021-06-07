import supertest from 'supertest'
import Joi from 'joi'
import app from '../../../../../src/app'
import { MESSAGE_TYPES } from '../../../../../src/utils/enums'

const endpoint = '/api/admin/swimmingPools'

const schema = Joi.object().keys({
	data: Joi.object(),
	messages: Joi.array().items(Joi.object().keys({
		message: Joi.string().invalid('_NEPRELOZENE_'),
		type: Joi.string().valid(...MESSAGE_TYPES),
		path: Joi.string()
	}))
})

describe(`[POST] ${endpoint})`, () => {
	const request = supertest(app)

	it('Expect status 401 | Invalid or missing auth token', async () => {
		const response = await request.post(endpoint)
			.set('Content-Type', 'application/json')
		expect(response.status).toBe(401)
	})

	it('Expect status 403 | Unathorized (Base user)', async () => {
		const response = await request.post(endpoint)
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${process.env.jwtBase}`)
		expect(response.status).toBe(403)
	})

	it('Expect status 403 | Unathorized (Swimming operator)', async () => {
		const response = await request.post(endpoint)
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${process.env.jwtSwimmingPoolOperator}`)
		expect(response.status).toBe(403)
	})

	it('Expect status 403 | Unathorized (Swimming employee)', async () => {
		const response = await request.post(endpoint)
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${process.env.jwtSwimmingPoolEmployee}`)
		expect(response.status).toBe(403)
	})

	it('Response should return code 200', async () => {
		const response = await request.post(endpoint)
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${process.env.jwtOperator}`)
			.send({
				name: 'Delfín',
				description: 'Popis kupaliska delfín.',
				expandedDescription: 'Dlhsí Popis kupaliska delfín.',
				waterTemp: -5,
				maxCapacity: 1000,
				openingHours: [{ startFrom: '2021-01-01', startTo: '2022-01-01' }],
				facilities: ["changing-room", "food", "playground"],
				locationUrl : "https://goo.gl/maps/YST1w1Q7Vt7EpBDh9",
				image: {
					"base64": "data:image/jpeg;base64,asda",
					altText: 'Fotka kupaliska delfin'
				}
			})
		expect(response.status).toBe(200)
		expect(response.type).toBe('application/json')
		expect(schema.validate(response.body).error).toBeUndefined()
		expect(response.body.data.swimmingPool.name).toBe('Delfín')
		expect(response.body.data.swimmingPool.waterTemp).toBe(-5)
		expect(response.body.data.swimmingPool.locationUrl).toBe('https://goo.gl/maps/YST1w1Q7Vt7EpBDh9')
		expect(response.body.data.swimmingPool.openingHours).toStrictEqual([{ startFrom: '2021-01-01', startTo: '2022-01-01' }])
		expect(response.body.data.swimmingPool.facilities).toStrictEqual(["changing-room", "food", "playground"])
	})
})
