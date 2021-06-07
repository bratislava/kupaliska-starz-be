import {
	Sequelize,
	DataTypes,
	literal,
} from 'sequelize'

import { DatabaseModel } from '../../types/models'

export class SwimmingPoolUserModel extends DatabaseModel {
	userId: string
	swimmingPoolId: string
	createdAt: Date
	updatedAt: Date
}

export default (sequelize: Sequelize) => {
	SwimmingPoolUserModel.init({
		userId: {
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
		modelName: 'swimmingPoolUser',
	})

	return SwimmingPoolUserModel
}
