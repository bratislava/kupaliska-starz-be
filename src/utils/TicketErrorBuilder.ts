import {
	CHECK_STATUS,
	TICKET_CHECKIN_ERROR_CODE,
	TICKET_CHECKOUT_ERROR_CODE,
} from './enums'

interface ITicketErrorBuilderItem {
	text: string
	code: TICKET_CHECKIN_ERROR_CODE | TICKET_CHECKOUT_ERROR_CODE
	optionalCheck: boolean
}

export default class TicketErrorBuilder {
	status: string
	items: ITicketErrorBuilderItem[]

	constructor() {
		this.status = CHECK_STATUS.OK
		this.items = []
	}

	addError(
		errorCode: TICKET_CHECKIN_ERROR_CODE | TICKET_CHECKOUT_ERROR_CODE,
		text: string,
		optionalCheck = false
	) {
		this.items.push({
			text,
			optionalCheck,
			code: errorCode,
		})
		if (optionalCheck === false) {
			this.status = CHECK_STATUS.NOK
		}
	}

	getErrors() {
		return this.items
	}

	getStatus() {
		return this.status
	}
}
