import { ENTRY_TYPE } from './../../../src/utils/enums';
import each from 'jest-each';
import { EntryModel } from '../../../src/db/models/entry';
import { SwimmingPoolModel } from '../../../src/db/models/swimmingPool';
import { TicketTypeModel } from '../../../src/db/models/ticketType';
import { TICKET_TYPE } from '../../../src/utils/enums';
import { TicketModel } from './../../../src/db/models/ticket';

describe('Ticket model', () => {

	each([
		[['11111111', '22222222'], '22222222', true],
		[['11111111', '22222222'], '11111111', true],
		[['11111111', '22222222'], '33333333', false],
		[['11111111', '22222222'], '2222222', false],
		[['11111111', '22222222'], '1111111', false],
	]).it("Customer can enter only allowed swimming pools ( input is '%s' '%s' '%s' )", async (allowedSwimmingPools, testSwimmingPool, expected) => {
		let ticket = new TicketModel()
		ticket.ticketType = new TicketTypeModel()
		ticket.ticketType.swimmingPools = []
		for (const pool of allowedSwimmingPools) {
			ticket.ticketType.swimmingPools.push(new SwimmingPoolModel({ id: pool }))
		}

		if (expected) {
			expect(ticket.canCustomerEnterSwimmingPool(testSwimmingPool)).toBe(true)
		} else {
			expect(ticket.canCustomerEnterSwimmingPool(testSwimmingPool)).toBe(false)
		}
    });

	each([
		['2021-05-12', '2021-08-12' , '2021-05-12 00:00:00', true],
		['2021-05-12', '2021-08-12' , '2021-08-12 23:59:59', true],
		['2021-05-12', '2021-08-12' , '2021-06-15 05:25:34', true],
		['2021-05-12', '2021-08-12' , '2021-05-11 23:59:59', false],
		['2021-05-12', '2021-08-12' , '2021-08-13 00:00:01', false],
		['2021-05-12', '2021-08-12' , '2020-06-13 00:00:00', false],
		['2021-05-12', '2021-08-12' , '2022-06-13 00:00:00', false],

	]).it("Customer can enter only between valid dates ( input is '%s' '%s' '%s' '%s' )", async (validFrom, validTo, testTime, expected) => {
		let ticket = new TicketModel()
		ticket.ticketType = new TicketTypeModel({
			validFrom: validFrom,
			validTo: validTo
		})
		jest.useFakeTimers('modern')
		jest.setSystemTime(new Date(testTime));

		if (expected) {
			expect(ticket.isBetweenValidDates()).toBe(true)
		} else {
			expect(ticket.isBetweenValidDates()).toBe(false)
		}
		jest.useRealTimers();
    });

	each([
		[TICKET_TYPE.ENTRIES, 1, undefined, true],
		[TICKET_TYPE.ENTRIES, 5, undefined, true],
		[TICKET_TYPE.ENTRIES, 1000, undefined, true],
		[TICKET_TYPE.ENTRIES, 0, undefined, false],
		[TICKET_TYPE.ENTRIES, -1, undefined, false],
		[TICKET_TYPE.ENTRIES, null, undefined, false],
		[TICKET_TYPE.ENTRIES, null, new EntryModel(), true],
		[TICKET_TYPE.SEASONAL, null, undefined, true],

	]).it("Test enough remaining entries ( input is '%s' '%s' '%s' '%s' )", async (ticketType, remainingEntries, entry, expected) => {
		let ticket = new TicketModel()
		ticket.ticketType = new TicketTypeModel()
		ticket.ticketType.type = ticketType
		ticket.remainingEntries = remainingEntries

		if (expected) {
			expect(ticket.enoughRemainingEntries(entry)).toBe(true)
		} else {
			expect(ticket.enoughRemainingEntries(entry)).toBe(false)
		}

    });

	each([
		['08:15:00', '19:00:00', true, '2021-05-12 08:15:00', true],
		['08:15:00', '19:00:00', true, '2021-05-12 19:00:59', true],
		['08:15:00', '19:00:00', true, '2021-05-12 16:59:59', true],
		['17:00', '23:59', true, '2021-05-12 16:59:59', false],
		['17:00', '23:59', true, '2021-05-12 17:00:00', true],
		['17:00', '23:59', true, '2021-05-12 23:00:00', true],
		['17:00', '23:59', true, '2021-05-12 00:00:00', false],
		['08:15:00', '19:00:00', true, '2021-05-12 08:14:59', false],
		['08:15:00', '19:00:00', true, '2021-05-12 19:01:00', false],
		['08:15:00', '19:00:00', true, '2021-05-12 00:00:00', false],
		['08:15:00', '19:00:00', true, '2021-05-12 23:59:59', false],
		['08:15:00', '19:00:00', false, '', true],

	]).it("Test entrance constraints ( input is '%s' '%s' '%s' '%s' '%s' )", async (entranceFrom, entranceTo, hasEntranceConstraints, testTime, expected) => {
		let ticket = new TicketModel()
		ticket.ticketType = new TicketTypeModel({
			entranceFrom: entranceFrom,
			entranceTo: entranceTo,
		})

		jest.useFakeTimers('modern')

		ticket.ticketType.hasEntranceConstraints = hasEntranceConstraints

		jest.setSystemTime(new Date(testTime));
		if (expected) {
			expect(ticket.checkEntranceContraints()).toBe(true)
		} else {
			expect(ticket.checkEntranceContraints()).toBe(false)
		}

		jest.useRealTimers();
    });

	each([
		[true, '02:15:00', new EntryModel({ timestamp: '2021-05-03 15:55:10' }), '2021-05-03 15:55:10', true],
		[true, '02:15:00', new EntryModel({ timestamp: '2021-05-03 15:55:10' }), '2021-05-03 18:10:10', true],
		[true, '02:15:00', new EntryModel({ timestamp: '2021-05-03 15:55:10' }), '2021-05-03 18:10:11', false],
		[true, '02:15:00', new EntryModel({ timestamp: '2021-05-03 15:55:10' }), '2021-05-03 18:11:00', false],
		[true, '03:05:00', new EntryModel({ timestamp: '2021-05-03 23:00:00' }), '2021-05-03 23:59:59', true],
		[true, '03:05:00', new EntryModel({ timestamp: '2021-05-03 23:00:00' }), '2021-05-04 00:00:00', true],
		[true, '03:05:00', new EntryModel({ timestamp: '2021-05-03 23:00:00' }), '2021-05-04 00:00:01', true],
		[true, '03:05:00', new EntryModel({ timestamp: '2021-05-03 23:00:00' }), '2021-05-04 02:05:00', true],
		[true, '03:05:00', new EntryModel({ timestamp: '2021-05-03 23:00:00' }), '2021-05-04 02:05:01', false],
		[false, '03:05:00', new EntryModel({ timestamp: '2021-05-03 23:00:00' }), '', true],
		[true, '03:05:00', undefined, '', true],

	]).it("Test ticket duration ( input is '%s' '%s' '%s' '%s' '%s' )", async (hasTicketDuration, ticketDuration, entry, testTime, expected) => {
		let ticket = new TicketModel()
		ticket.ticketType = new TicketTypeModel()
		jest.useFakeTimers('modern')

		ticket.ticketType.hasTicketDuration = hasTicketDuration
		ticket.ticketType.ticketDuration = ticketDuration

		jest.setSystemTime(new Date(testTime));

		if (expected) {
			expect(ticket.checkTicketDuration(entry)).toBe(true)
		} else {
			expect(ticket.checkTicketDuration(entry)).toBe(false)
		}

		jest.useRealTimers();
    });

	it("Test customer last action", async () => {
		let ticket = new TicketModel()
		const entry = new EntryModel()

		expect(ticket.isCustomerLastActionCheckIn(undefined)).toBe(false)
		expect(ticket.isCustomerLastActionCheckOut(undefined)).toBe(true)

		entry.type = ENTRY_TYPE.CHECKIN
		expect(ticket.isCustomerLastActionCheckIn(entry)).toBe(true)
		expect(ticket.isCustomerLastActionCheckOut(entry)).toBe(false)

		entry.type = ENTRY_TYPE.CHECKOUT
		expect(ticket.isCustomerLastActionCheckIn(entry)).toBe(false)
		expect(ticket.isCustomerLastActionCheckOut(entry)).toBe(true)

    });

});
