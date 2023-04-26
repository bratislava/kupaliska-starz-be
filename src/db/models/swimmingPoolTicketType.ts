import { Sequelize, DataTypes, literal } from 'sequelize'

import { DatabaseModel } from '../../types/models'

export class SwimmingPoolTicketTypeModel extends DatabaseModel {
	ticketTypeId: string
	swimmingPoolId: string
	createdAt: Date
	updatedAt: Date
}

export default (sequelize: Sequelize) => {
	SwimmingPoolTicketTypeModel.init(
		{
			ticketTypeId: {
				type: DataTypes.UUID,
				primaryKey: true,
				allowNull: false,
			},
			swimmingPoolId: {
				type: DataTypes.UUID,
				primaryKey: true,
				allowNull: false,
			},
			createdAt: {
				type: DataTypes.DATE,
				allowNull: false,
				defaultValue: literal('NOW()'),
			},
			updatedAt: {
				type: DataTypes.DATE,
				allowNull: false,
				defaultValue: literal('NOW()'),
			},
		},
		{
			freezeTableName: true,
			timestamps: true,
			sequelize,
			modelName: 'swimmingPoolTicketType',
		}
	)

	return SwimmingPoolTicketTypeModel
}
