import i18next from 'i18next'
import { TicketTypeModel } from '../db/models/ticketType'

export const getTicketNameTranslation = (
	ticketType: TicketTypeModel,
	numberOfTickets: number,
	declesionForm: string = 'n'
) => {
	if (ticketType.isDisposable) {
		return i18next.t(`ticket`, {
			context: `${declesionForm}`,
			count: numberOfTickets,
		})
	} else {
		return i18next.t(`seasonTicket`, {
			context: `${declesionForm}`,
			count: numberOfTickets,
		})
	}
}

export const getChildrenTicketName = (name: string) => {
	return `${i18next.t('childish')} ${name.toLowerCase()}`
}
