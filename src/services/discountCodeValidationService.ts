import { Op } from 'sequelize'
import { DiscountCodeModel } from '../db/models/discountCode'

export const getDiscountCode = async (code: string) => {
	return await DiscountCodeModel.scope(['valid']).findOne({
		where: {
			code: {
				[Op.eq]: code.toUpperCase(),
			},
			usedAt: {
				[Op.is]: null,
			},
		},
		include: [
			{
				association: 'ticketTypes',
			},
		],
		attributes: ['id', 'code', 'amount'],
	})
}
