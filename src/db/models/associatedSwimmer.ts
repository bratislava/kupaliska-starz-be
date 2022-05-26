/* eslint import/no-cycle: 0 */

import { Sequelize, DataTypes, literal, UUIDV4 } from 'sequelize'

import { DatabaseModel } from '../../types/models'

export class AssociatedSwimmerModel extends DatabaseModel {
	id: string
	swimmingLoggedUserId: string
	surname: string
	lastname: string
	age: number
	zip: string
	createdAt: Date
	updatedAt: Date
	deletedAt: Date
	// lastLoginAt: Date
	// functions
}

export default (sequelize: Sequelize) => {
	AssociatedSwimmerModel.init(
		{
			id: {
				type: DataTypes.UUID,
				primaryKey: true,
				allowNull: false,
				defaultValue: UUIDV4,
			},
			swimmingLoggedUserId: {
				type: DataTypes.UUID,
				allowNull: false,
				defaultValue: UUIDV4,
			},
			surname: {
				type: DataTypes.STRING(255),
				allowNull: true,
			},
			lastname: {
				type: DataTypes.STRING(255),
				allowNull: true,
			},
			age: {
				type: DataTypes.SMALLINT,
				allowNull: true,
			},
			zip: {
				type: DataTypes.STRING(10),
				allowNull: true,
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
			deletedAt: {
				type: DataTypes.DATE,
				allowNull: true,
			},
		},
		{
			defaultScope: {
				where: {
					// isConfirmed: true
				},
			},
			paranoid: true,
			timestamps: true,
			sequelize,
			modelName: 'swimmingLoggedUser',
		}
	)

	// SwimmingLoggedUserModel.associate = (models) => {
	// 	SwimmingUserModel.belongsToMany(models.SwimmingPool, {
	// 		through: {
	// 			model: models.SwimmingPoolUser
	// 		},
	// 		foreignKey: {
	// 			name: 'userId',
	// 			allowNull: false
	// 		},
	// 		otherKey: {
	// 			name: 'swimmingPoolId',
	// 			allowNull: false
	// 		},
	// 		as: 'swimmingPools'
	// 	});
	// }

	return AssociatedSwimmerModel
}
