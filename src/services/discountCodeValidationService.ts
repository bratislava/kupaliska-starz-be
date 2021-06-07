import { Op } from "sequelize"
import { DiscountCodeModel } from "../db/models/discountCode"

export const getDiscountCode = async (code: string, ticketTypeId: string) => {
	return await DiscountCodeModel.scope(['valid', { method: ['byTicketType', ticketTypeId] }])
		.findOne({
			where: {
				code: {
					[Op.eq]: code.toUpperCase()
				},
				usedAt: {
					[Op.is]: null
				}
			},
			attributes: ['id', 'code', 'amount']
		})
}
