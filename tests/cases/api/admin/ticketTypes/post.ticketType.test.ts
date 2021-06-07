import supertest from 'supertest'
import Joi from 'joi'
import app from '../../../../../src/app'
import { MESSAGE_TYPES, TICKET_TYPE } from '../../../../../src/utils/enums'
import faker from 'faker'

const endpoint = '/api/admin/ticketTypes'

const schema = Joi.object().keys({
	data: Joi.object().keys({
		id: Joi.string().guid({ version: ['uuidv4'] }),
		ticketType: Joi.object()
	}),
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

	it('Response should return code 200 - create seasonal ticket', async () => {
		const response = await request.post(endpoint)
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${process.env.jwtOperator}`)
			.send({
				name: 'Sezónny tiket',
				description: faker.lorem.paragraph(15),
				price: 20,
				type: TICKET_TYPE.SEASONAL,
				nameRequired: true,
				photoRequired: true,
				swimmingPools: ['c70954c7-970d-4f1a-acf4-12b91acabe01'],
				childrenAllowed: true,
				childrenMaxNumber: 5,
				childrenPrice: 1,
				childrenAgeFrom: 3,
				childrenAgeTo: 18,
				childrenAgeToWithAdult: 10,
				childrenPhotoRequired: true,
				validFrom: '2021-04-12',
				validTo: '2021-07-12',
				hasTicketDuration: false,
				hasEntranceConstraints: false,
			})
		expect(response.status).toBe(200)
		expect(response.type).toBe('application/json')
		expect(schema.validate(response.body).error).toBeUndefined()
	})

	it('Response should return code 200 - create entries ticket', async () => {
		const response = await request.post(endpoint)
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${process.env.jwtOperator}`)
			.send({
				name: 'Jednorázový tiket',
				description: faker.lorem.paragraph(15),
				price: 40,
				type: TICKET_TYPE.ENTRIES,
				swimmingPools: ['c70954c7-970d-4f1a-acf4-12b91acabe01'],
				nameRequired: false,
				photoRequired: false,
				childrenAllowed: false,
				entriesNumber: 1,
				hasTicketDuration: false,
				hasEntranceConstraints: true,
				entranceFrom: '15:30',
				entranceTo: '23:59',
				validFrom: '2021-04-12',
				validTo: '2021-07-12',
			})
		expect(response.status).toBe(200)
		expect(response.type).toBe('application/json')
		expect(schema.validate(response.body).error).toBeUndefined()
	})

	it('ENTRIES ticket must have entranceNumber', async () => {
		const response = await request.post(endpoint)
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${process.env.jwtOperator}`)
			.send({
				name: 'Jednorázový tiket',
				description: faker.lorem.paragraph(15),
				price: 40,
				type: TICKET_TYPE.ENTRIES,
				swimmingPools: ['c70954c7-970d-4f1a-acf4-12b91acabe01'],
				nameRequired: true,
				photoRequired: true,
				childrenAllowed: false,
				hasTicketDuration: false,
				hasEntranceConstraints: false,
				validFrom: '2021-04-12',
				validTo: '2021-07-12',
			})
		expect(response.status).toBe(400)
		expect(schema.validate(response.body).error).toBeUndefined()
		expect(response.body.messages[0].path).toBe('body.entriesNumber')
	})

	it('Children properties must be filled when children`s are allowed', async () => {
		const response = await request.post(endpoint)
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${process.env.jwtOperator}`)
			.send({
				name: 'Jednorázový tiket',
				description: faker.lorem.paragraph(15),
				price: 40,
				type: TICKET_TYPE.ENTRIES,
				swimmingPools: ['c70954c7-970d-4f1a-acf4-12b91acabe01'],
				nameRequired: true,
				photoRequired: true,
				childrenAllowed: true,
				hasTicketDuration: false,
				hasEntranceConstraints: false,
				entriesNumber: 1,
				validFrom: '2021-04-12',
				validTo: '2021-07-12',
			})
		expect(response.status).toBe(400)
		expect(schema.validate(response.body).error).toBeUndefined()
		expect(response.body.messages).toEqual(expect.arrayContaining([expect.objectContaining({ path: 'body.childrenMaxNumber' })]))
		expect(response.body.messages).toEqual(expect.arrayContaining([expect.objectContaining({ path: 'body.childrenPrice' })]))
		expect(response.body.messages).toEqual(expect.arrayContaining([expect.objectContaining({ path: 'body.childrenAgeFrom' })]))
		expect(response.body.messages).toEqual(expect.arrayContaining([expect.objectContaining({ path: 'body.childrenAgeTo' })]))
		expect(response.body.messages).toEqual(expect.arrayContaining([expect.objectContaining({ path: 'body.childrenAgeToWithAdult' })]))
		expect(response.body.messages).toEqual(expect.arrayContaining([expect.objectContaining({ path: 'body.childrenPhotoRequired' })]))
	})

	it('Should connect swimming pool to the ticket type', async () => {
		const response = await request.post(endpoint)
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${process.env.jwtOperator}`)
			.send({
				name: 'Jednorázový tiket',
				description: faker.lorem.paragraph(15),
				price: 40,
				type: TICKET_TYPE.ENTRIES,
				swimmingPools: ['c70954c7-970d-4f1a-acf4-12b91acabe01'],
				nameRequired: true,
				photoRequired: true,
				childrenAllowed: false,
				hasTicketDuration: false,
				hasEntranceConstraints: false,
				entriesNumber: 1,
				validFrom: '2021-04-12',
				validTo: '2021-07-12',
			})
		expect(response.status).toBe(200)
		expect(schema.validate(response.body).error).toBeUndefined()
		expect(response.body.data.ticketType.swimmingPools).toStrictEqual([
			{
				id: 'c70954c7-970d-4f1a-acf4-12b91acabe01',
				name: 'Delfín',
			}
		])
	})

	it('Should return 400 | Incorrect swimming pools in request', async () => {
		const response = await request.post(endpoint)
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${process.env.jwtOperator}`)
			.send({
				name: 'Jednorázový tiket',
				description: faker.lorem.paragraph(15),
				price: 40,
				type: TICKET_TYPE.ENTRIES,
				swimmingPools: ['c70954c7-970d-4f1a-acf4-12b91acabe05', 'c70954c7-970d-4f1a-acf4-12b91acabe02'],
				nameRequired: true,
				photoRequired: true,
				childrenAllowed: false,
				hasTicketDuration: false,
				hasEntranceConstraints: false,
				entriesNumber: 1,
				validFrom: '2021-04-12',
				validTo: '2021-07-12',
			})
		expect(response.status).toBe(400)
		expect(response.body.messages[0].path).toBe('incorrectSwimmingPools')

	})

	it('MUST have ticketDuration if hasTicketDuration is true', async () => {
		const response = await request.post(endpoint)
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${process.env.jwtOperator}`)
			.send({
				name: 'Časovy listok tiket',
				description: faker.lorem.paragraph(15),
				price: 40,
				type: TICKET_TYPE.ENTRIES,
				swimmingPools: ['c70954c7-970d-4f1a-acf4-12b91acabe01'],
				nameRequired: true,
				photoRequired: true,
				entriesNumber: 20,
				hasTicketDuration: true,
				hasEntranceConstraints: false,
				childrenAllowed: false,
				validFrom: '2021-04-12',
				validTo: '2021-07-12',
			})
		expect(response.status).toBe(400)
		expect(schema.validate(response.body).error).toBeUndefined()
		expect(response.body.messages).toEqual(expect.arrayContaining([expect.objectContaining({ path: 'body.ticketDuration' })]))

	})

	it('MUST have entranceFrom and entranceTo if hasEntranceConstraints is true', async () => {
		const response = await request.post(endpoint)
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${process.env.jwtOperator}`)
			.send({
				name: 'Časovy listok tiket',
				description: faker.lorem.paragraph(15),
				price: 40,
				type: TICKET_TYPE.ENTRIES,
				swimmingPools: ['c70954c7-970d-4f1a-acf4-12b91acabe01'],
				nameRequired: true,
				photoRequired: true,
				entriesNumber: 20,
				hasTicketDuration: false,
				hasEntranceConstraints: true,
				childrenAllowed: false,
				validFrom: '2021-04-12',
				validTo: '2021-07-12',
			})
		expect(response.status).toBe(400)
		expect(schema.validate(response.body).error).toBeUndefined()
		expect(response.body.messages).toEqual(expect.arrayContaining([expect.objectContaining({ path: 'body.entranceFrom' })]))
		expect(response.body.messages).toEqual(expect.arrayContaining([expect.objectContaining({ path: 'body.entranceTo' })]))
	})

	it('hasEntranceConstraints and hasTicketDuration CAN`T be both TRUE', async () => {
		const response = await request.post(endpoint)
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${process.env.jwtOperator}`)
			.send({
				name: 'Časovy listok tiket',
				description: faker.lorem.paragraph(15),
				price: 40,
				type: TICKET_TYPE.ENTRIES,
				swimmingPools: ['c70954c7-970d-4f1a-acf4-12b91acabe01'],
				nameRequired: true,
				photoRequired: true,
				entriesNumber: 20,
				hasTicketDuration: true,
				ticketDuration: "02:00",
				hasEntranceConstraints: true,
				entranceFrom: "17:00",
				entranceTo: "23:59",
				childrenAllowed: false,
				validFrom: '2021-04-12',
				validTo: '2021-07-12',
			})
		expect(response.status).toBe(400)
		expect(schema.validate(response.body).error).toBeUndefined()
		expect(response.body.messages).toEqual(expect.arrayContaining([expect.objectContaining({ path: 'body.hasTicketDuration' })]))
	})

	it('Should create Entries ticket with duration', async () => {
		const response = await request.post(endpoint)
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${process.env.jwtOperator}`)
			.send({
				name: 'Jednorázový tiket',
				description: faker.lorem.paragraph(15),
				price: 40,
				type: TICKET_TYPE.ENTRIES,
				swimmingPools: ['c70954c7-970d-4f1a-acf4-12b91acabe01'],
				nameRequired: true,
				photoRequired: true,
				childrenAllowed: false,
				entriesNumber: 1,
				hasEntranceConstraints: false,
				hasTicketDuration: true,
				ticketDuration: "01:30",
				validFrom: '2021-04-12',
				validTo: '2021-07-12',
			})
		expect(response.status).toBe(200)
		expect(schema.validate(response.body).error).toBeUndefined()
	})
})
