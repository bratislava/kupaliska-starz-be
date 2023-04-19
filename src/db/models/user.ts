/* eslint import/no-cycle: 0 */

import { Sequelize, DataTypes, literal, UUIDV4 } from 'sequelize'

import { DatabaseModel } from '../../types/models'
import { USER_ROLE } from '../../utils/enums'
import { SwimmingPoolModel } from './swimmingPool'

export class UserModel extends DatabaseModel {
	id: string
	email: string
	name: string
	hash: string
	salt: string
	issuedTokens: number
	tokenValidFromNumber: number
	role: USER_ROLE
	swimmingPools: SwimmingPoolModel[]
	createdAt: Date
	updatedAt: Date
	deletedAt: Date
	isConfirmed: boolean
	lastLoginAt: Date
	// functions
	canPerformAction(targetRole: USER_ROLE) {
		if (this.role === USER_ROLE.SUPER_ADMIN) {
			return targetRole !== USER_ROLE.SUPER_ADMIN
		}

		if (this.role === USER_ROLE.OPERATOR) {
			return (
				targetRole !== USER_ROLE.SUPER_ADMIN &&
				targetRole !== USER_ROLE.OPERATOR
			)
		}
		return false
	}
}

export default (sequelize: Sequelize) => {
	UserModel.init(
		{
			id: {
				type: DataTypes.UUID,
				primaryKey: true,
				allowNull: false,
				defaultValue: UUIDV4,
			},
			email: {
				type: DataTypes.STRING(255),
				allowNull: false,
			},
			name: {
				type: DataTypes.STRING(500),
				allowNull: false,
			},
			hash: {
				type: DataTypes.TEXT,
				allowNull: false,
			},
			issuedTokens: {
				type: DataTypes.INTEGER,
				defaultValue: 0,
				allowNull: false,
			},
			tokenValidFromNumber: {
				type: DataTypes.INTEGER,
				defaultValue: 0,
				allowNull: false,
			},
			role: {
				type: DataTypes.STRING(50),
				allowNull: false,
			},
			isConfirmed: {
				type: DataTypes.BOOLEAN,
				defaultValue: false,
				allowNull: false,
			},
			lastLoginAt: {
				type: DataTypes.DATE,
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
		},
		{
			defaultScope: {
				where: {
					isConfirmed: true,
				},
			},
			paranoid: true,
			timestamps: true,
			sequelize,
			modelName: 'user',
		}
	)

	UserModel.associate = (models) => {
		UserModel.belongsToMany(models.SwimmingPool, {
			through: {
				model: models.SwimmingPoolUser,
			},
			foreignKey: {
				name: 'userId',
				allowNull: false,
			},
			otherKey: {
				name: 'swimmingPoolId',
				allowNull: false,
			},
			as: 'swimmingPools',
		})
	}

	return UserModel
}
