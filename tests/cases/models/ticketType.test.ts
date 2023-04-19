import each from 'jest-each'
import { TicketTypeModel } from '../../../src/db/models/ticketType'

describe('Ticket type model', () => {
	each([
		['2021-05-03 15:55:00', '2021-05-03', 29100000],
		['2021-05-03 15:55:00', '2021-05-04', 115500000],
	]).it(
		"Test ticket type expires in ( input is '%s' '%s' '%s' )",
		async (now, validTo, expectedMs) => {
			let ticketType = new TicketTypeModel()
			ticketType.validTo = validTo

			jest.useFakeTimers('modern')
			jest.setSystemTime(new Date(now))

			expect(ticketType.getExpiresIn()).toBe(expectedMs)

			jest.useRealTimers()
		}
	)
})
