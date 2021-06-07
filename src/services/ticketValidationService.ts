import i18next from "i18next";
import { find, last } from "lodash";
import { TicketModel } from "../db/models/ticket";
import { TICKET_CHECKIN_ERROR_CODE, TICKET_CHECKOUT_ERROR_CODE } from "../utils/enums";
import TicketErrorBuilder from "../utils/TicketErrorBuilder";

export const validateCheckin = (ticket: TicketModel, swimmingPoolId: string) => {

	const checkinTicketErrorBuilder = new TicketErrorBuilder()
	const lastEntry = last(ticket.entries)
	const firstCheckInEntry = find(ticket.entries, (entry) =>
		(entry.isCheckIn())
	)

	if (ticket.order.isPaid() === false) {
		checkinTicketErrorBuilder.addError(TICKET_CHECKIN_ERROR_CODE.ORDER_NOT_PAID, i18next.t('error:ticket.orderHasNotBeenPaid'))
	}

	if (ticket.canCustomerEnterSwimmingPool(swimmingPoolId) === false) {
		checkinTicketErrorBuilder.addError(TICKET_CHECKIN_ERROR_CODE.FORBIDDEN_SWIMMING_POOL, i18next.t('error:ticket.forbiddenSwimmingPool'))
	}

	if (ticket.isBetweenValidDates() === false) {
		checkinTicketErrorBuilder.addError(TICKET_CHECKIN_ERROR_CODE.NOT_BETWEEN_VALID_DATES, i18next.t('error:ticket.notBetweenValidDates'))
	}

	if (ticket.isCustomerLastActionCheckIn(lastEntry)) {
		checkinTicketErrorBuilder.addError(TICKET_CHECKIN_ERROR_CODE.CUSTOMER_ALREADY_CHECK_IN, i18next.t('error:ticket.customerAlreadyCheckIn'), true)
	}

	if (ticket.enoughRemainingEntries(firstCheckInEntry) === false) {
		checkinTicketErrorBuilder.addError(TICKET_CHECKIN_ERROR_CODE.NOT_ENOUGH_REMAINING_ENTRIES, i18next.t('error:ticket.notEnoughRemainingEntries'))
	}

	if (ticket.checkEntranceContraints() === false) {
		checkinTicketErrorBuilder.addError(TICKET_CHECKIN_ERROR_CODE.FORBIDDEN_ENTRY_TIME, i18next.t('error:ticket.forbiddenEntryTime'))
	}

	if (ticket.checkTicketDuration(firstCheckInEntry) === false) {
		checkinTicketErrorBuilder.addError(TICKET_CHECKIN_ERROR_CODE.TICKET_DURATION_EXPIRED, i18next.t('error:ticket.ticketDurationExpired'))
	}

	return checkinTicketErrorBuilder
}

export const validateCheckout = (ticket: TicketModel, swimmingPoolId: string) => {

	const checkoutTicketErrorBuilder = new TicketErrorBuilder()
	const lastEntry = last(ticket.entries)
	const firstCheckInEntry = find(ticket.entries, (entry) =>
		(entry.isCheckIn())
	)

	if (ticket.canCustomerEnterSwimmingPool(swimmingPoolId) === false) {
		checkoutTicketErrorBuilder.addError(TICKET_CHECKOUT_ERROR_CODE.FORBIDDEN_SWIMMING_POOL, i18next.t('error:ticket.forbiddenSwimmingPool'),  true)
	}

	if (ticket.isCustomerLastActionCheckOut(lastEntry)) {
		checkoutTicketErrorBuilder.addError(TICKET_CHECKOUT_ERROR_CODE.CUSTOMER_DID_NOT_CHECK_IN, i18next.t('error:ticket.customerDidNotCheckIn'), true)
	}

	if (ticket.checkEntranceContraints() === false) {
		checkoutTicketErrorBuilder.addError(TICKET_CHECKOUT_ERROR_CODE.CHECKOUT_AFTER_ALLOWED_TIME, i18next.t('error:ticket.checkoutAfterAllowedTime'), true)
	}

	if (ticket.checkTicketDuration(firstCheckInEntry) === false) {
		checkoutTicketErrorBuilder.addError(TICKET_CHECKOUT_ERROR_CODE.CHECKOUT_TICKET_DURATION_EXPIRED, i18next.t('error:ticket.checkoutTicketDurationExpired'), true)
	}

	return checkoutTicketErrorBuilder
}
