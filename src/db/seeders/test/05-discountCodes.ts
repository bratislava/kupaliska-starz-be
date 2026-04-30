import { QueryInterface } from 'sequelize'
import faker from 'faker'
import { v4 as uuidv4 } from 'uuid'
import { createDiscountCode } from '../../factories/discountCode'
import { DiscountCodeModel } from '../../models/discountCode'

export const discountCodeId = uuidv4()
export const discountCodeId2 = uuidv4()
export const discountCodeId3 = uuidv4()
export const discountCode = 'AAAAAAAA'
export const discountCode2 = 'BBBBBBBB'
export const discountCode3 = 'CCCCCCCC'

export async function up(queryInterface: QueryInterface) {
	await DiscountCodeModel.bulkCreate([
		{
			...createDiscountCode(discountCodeId, discountCode),
			amount: 20,
		},
		{
			...createDiscountCode(discountCodeId2, discountCode2),
			amount: 30,
		},
		{
			...createDiscountCode(discountCodeId3, discountCode3),
			amount: 20,
		},
	])
}

export async function down(queryInterface: QueryInterface) {
	// This is intentional
}
