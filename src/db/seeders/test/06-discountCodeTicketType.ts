import { QueryInterface } from 'sequelize'
import faker from 'faker'
import { v4 as uuidv4 } from 'uuid'
import { DiscountCodeTicketTypeModel } from '../../models/discountCodeTicketType'
import { ticketTypeEntriesId, ticketTypeSeasonalWithChildren } from './01-ticketTypes'
import { discountCodeId, discountCodeId2, discountCodeId3 } from './05-discountCodes'

export async function up(queryInterface: QueryInterface) {
	await DiscountCodeTicketTypeModel.bulkCreate([
		{
			ticketTypeId: ticketTypeEntriesId,
			discountCodeId: discountCodeId,
		},
		{
			ticketTypeId: ticketTypeSeasonalWithChildren,
			discountCodeId: discountCodeId2,
		},
		{
			ticketTypeId: ticketTypeEntriesId,
			discountCodeId: discountCodeId3,
		},
	])
}

export async function down(queryInterface: QueryInterface) {
	// This is intentional
}
