import { createFile } from './../../../../../src/db/factories/file'
import { createSwimmingPool } from './../../../../../src/db/factories/swimmingPool'
import { SwimmingPoolUserModel } from './../../../../../src/db/models/swimmingPoolUser'
import supertest from 'supertest'
import Joi from 'joi'
import app from '../../../../../src/app'
import { MESSAGE_TYPES } from '../../../../../src/utils/enums'
import { SwimmingPoolModel } from '../../../../../src/db/models/swimmingPool'
import { v4 as uuidv4 } from 'uuid'
import { FileModel } from '../../../../../src/db/models/file'
import config from 'config'
import path from 'path'
import { IAppConfig } from '../../../../../src/types/interfaces'
import { writeFile } from 'fs/promises'
const appConfig: IAppConfig = config.get('app')

const endpoint = (id = swimmingPoolId) => `/api/admin/swimmingPools/${id}`

const schema = Joi.object().keys({
	data: Joi.object(),
	messages: Joi.array().items(
		Joi.object().keys({
			message: Joi.string().invalid('_NEPRELOZENE_'),
			type: Joi.string().valid(...MESSAGE_TYPES),
			path: Joi.string(),
		})
	),
})

const swimmingPoolId = uuidv4()
const swimmingPool2Id = uuidv4()

describe(`[PATCH] ${endpoint})`, () => {
	const request = supertest(app)

	beforeAll(async () => {
		await SwimmingPoolModel.bulkCreate([
			createSwimmingPool(swimmingPoolId),
			createSwimmingPool(swimmingPool2Id),
		])

		await FileModel.bulkCreate([createFile(swimmingPoolId)])

		await writeFile(
			path.join(
				appConfig.filesPath,
				'public/swimming-pools/filename-test.png'
			),
			'image'
		)

		await SwimmingPoolUserModel.create({
			swimmingPoolId: swimmingPoolId,
			userId: process.env.swimmingPoolOperatorId,
		})
	})

	it('Expect status 401 | Invalid or missing auth token', async () => {
		const response = await request
			.patch(endpoint())
			.set('Content-Type', 'application/json')
		expect(response.status).toBe(401)
	})

	it('Expect status 403 | Unathorized (Base user)', async () => {
		const response = await request
			.patch(endpoint())
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${process.env.jwtBase}`)
		expect(response.status).toBe(403)
	})

	it('Expect status 403 | Unathorized (Swimming employee)', async () => {
		const response = await request
			.patch(endpoint())
			.set('Content-Type', 'application/json')
			.set(
				'Authorization',
				`Bearer ${process.env.jwtSwimmingPoolEmployee}`
			)
		expect(response.status).toBe(403)
	})

	it('Response should return code 200', async () => {
		const response = await request
			.patch(endpoint())
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${process.env.jwtOperator}`)
			.send({
				name: 'Delfín',
				description: 'Novy popis',
				expandedDescription: 'Novy dlhsi popis',
				waterTemp: 10,
				maxCapacity: 500,
				openingHours: [
					{ startFrom: '2021-01-01', startTo: '2022-01-01' },
				],
				facilities: ['voleyball'],
				locationUrl: 'https://goo.gl/maps/YST1w1Q7Vt7EpAAA10',
				image: {
					base64: 'data:image/jpeg;base64,asda',
					altText: 'Fotka kupaliska delfin',
				},
				ordering: 1,
			})

		expect(response.status).toBe(200)
		expect(response.type).toBe('application/json')
		expect(schema.validate(response.body).error).toBeUndefined()
		expect(response.body.data.swimmingPool.name).toBe('Delfín')
		expect(response.body.data.swimmingPool.description).toBe('Novy popis')
		expect(response.body.data.swimmingPool.expandedDescription).toBe(
			'Novy dlhsi popis'
		)
		expect(response.body.data.swimmingPool.waterTemp).toBe(10)
		expect(response.body.data.swimmingPool.maxCapacity).toBe(500)
		expect(response.body.data.swimmingPool.locationUrl).toBe(
			'https://goo.gl/maps/YST1w1Q7Vt7EpAAA10'
		)
		expect(response.body.data.swimmingPool.openingHours).toStrictEqual([
			{ startFrom: '2021-01-01', startTo: '2022-01-01' },
		])
		expect(response.body.data.swimmingPool.facilities).toStrictEqual([
			'voleyball',
		])
		expect(response.body.data.swimmingPool.image.altText).toBe(
			'Fotka kupaliska delfin'
		)
		expect(response.body.data.swimmingPool.ordering).toBe(1)
	})

	it('Operator CAN patch his swimming pool', async () => {
		const response = await request
			.patch(endpoint(swimmingPoolId))
			.set('Content-Type', 'application/json')
			.set(
				'Authorization',
				`Bearer ${process.env.jwtSwimmingPoolOperator}`
			)
			.send({
				waterTemp: 0,
				maxCapacity: 100,
				openingHours: [
					{ startFrom: '2021-01-01', startTo: '2022-01-01' },
				],
			})

		expect(response.status).toBe(200)
		expect(response.body.data.swimmingPool.waterTemp).toBe(0)
		expect(response.body.data.swimmingPool.maxCapacity).toBe(100)
		expect(response.body.data.swimmingPool.openingHours).toStrictEqual([
			{ startFrom: '2021-01-01', startTo: '2022-01-01' },
		])
	})

	it('Operator CAN patch only waterTemp, maxCapacity and opening hours', async () => {
		const response = await request
			.patch(endpoint(swimmingPoolId))
			.set('Content-Type', 'application/json')
			.set(
				'Authorization',
				`Bearer ${process.env.jwtSwimmingPoolOperator}`
			)
			.send({
				name: 'Delfín',
				description: 'Novy popis',
				expandedDescription: 'Novy dlhsi popis',
				openingHours: [
					{ startFrom: '2021-01-01', startTo: '2022-01-01' },
				],
				facilities: ['voleyball'],
				locationUrl: 'https://goo.gl/maps/YST1w1Q7Vt7EpAAA10',
				waterTemp: 0,
				maxCapacity: 100,
				image: {
					base64: 'data:image/jpeg;base64,asda',
					altText: 'Fotka kupaliska delfin',
				},
				ordering: 1,
			})

		expect(response.status).toBe(400)

		expect(response.body.messages).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ path: 'body.name' }),
			])
		)
		expect(response.body.messages).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ path: 'body.description' }),
			])
		)
		expect(response.body.messages).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ path: 'body.expandedDescription' }),
			])
		)
		expect(response.body.messages).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ path: 'body.facilities' }),
			])
		)
		expect(response.body.messages).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ path: 'body.locationUrl' }),
			])
		)
		expect(response.body.messages).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ path: 'body.image' }),
			])
		)
		expect(response.body.messages).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ path: 'body.ordering' }),
			])
		)
	})

	it('Operator CANOT patch other swimming pool', async () => {
		const response = await request
			.patch(endpoint(swimmingPool2Id))
			.set('Content-Type', 'application/json')
			.set(
				'Authorization',
				`Bearer ${process.env.jwtSwimmingPoolOperator}`
			)
			.send({
				waterTemp: 0,
				maxCapacity: 100,
				openingHours: [
					{ startFrom: '2021-01-01', startTo: '2022-01-01' },
				],
			})

		expect(response.status).toBe(403)
	})
})
