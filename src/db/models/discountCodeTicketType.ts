/* eslint import/no-cycle: 0 */

import {
	Sequelize,
	DataTypes,
	literal,
} from 'sequelize'

import { DatabaseModel } from '../../types/models'

export class DiscountCodeTicketTypeModel extends DatabaseModel {
	ticketTypeId: string
	discountCodeId: string
	createdAt: Date
	updatedAt: Date
}

export default (sequelize: Sequelize) => {
	DiscountCodeTicketTypeModel.init({
		ticketTypeId: {
			type: DataTypes.UUID,
			primaryKey: true,
			allowNull: false,
		},
		discountCodeId: {
			type: DataTypes.UUID,
			primaryKey: true,
			allowNull: false,
		},
		createdAt: {
			type: DataTypes.DATE,
			allowNull: false,
			defaultValue: literal('NOW()')
		},
		updatedAt: {
			type: DataTypes.DATE,
			allowNull: false,
			defaultValue: literal('NOW()')
		}
	}, {
		freezeTableName: true,
		timestamps: true,
		sequelize,
		modelName: 'discountCodeTicketType',
	})

	return DiscountCodeTicketTypeModel
}
