import { FileModel } from './file';
/* eslint import/no-cycle: 0 */

import {
	Sequelize,
	DataTypes,
	literal,
	UUIDV4
} from 'sequelize'

import { DatabaseModel } from '../../types/models'

export class SwimmingPoolModel extends DatabaseModel {
	id: string
	name: string
	description: string
	expandedDescription: string
	waterTemp: number
	maxCapacity: number
	openingHours: string
	facilities: string
	image: FileModel
	locationUrl: string
	createdAt: Date
	updatedAt: Date
	deletedAt: Date
}

export default (sequelize: Sequelize) => {
	SwimmingPoolModel.init({
		id: {
			type: DataTypes.UUID,
			primaryKey: true,
			allowNull: false,
			defaultValue: UUIDV4,
		},
		description: {
			type: DataTypes.STRING(1000),
			allowNull: false
		},
		expandedDescription: {
			type: DataTypes.TEXT,
			allowNull: false
		},
		name: {
			type: DataTypes.STRING(500),
			allowNull: false
		},
		locationUrl: {
			type: DataTypes.STRING(1000),
			allowNull: false,
			defaultValue: ''
		},
		waterTemp: {
			type: DataTypes.SMALLINT,
			allowNull: true
		},
		maxCapacity: {
			type: DataTypes.SMALLINT,
			allowNull: false
		},
		openingHours: {
			type: DataTypes.JSON,
			allowNull: false,
		},
		facilities: {
			type: DataTypes.JSON,
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
		paranoid: true,
		timestamps: true,
		sequelize,
		modelName: 'swimmingPool',
	})

	SwimmingPoolModel.associate = (models) => {
		SwimmingPoolModel.hasOne(models.File, {
			foreignKey: 'relatedId',
			constraints: false,
			scope: {
				relatedType: 'swimmingPool'
			},
			as: 'image'
		})

		SwimmingPoolModel.belongsToMany(models.User,  {
			through: {
				model: models.SwimmingPoolUser
			},
			foreignKey: {
				name: 'swimmingPoolId',
				allowNull: false
			},
			otherKey: {
				name: 'userId',
				allowNull: false
			},
			as: 'users'
		});

		SwimmingPoolModel.belongsToMany(models.TicketType,  {
			through: {
				model: models.SwimmingPoolTicketType
			},
			foreignKey: {
				name: 'swimmingPoolId',
				allowNull: false
			},
			otherKey: {
				name: 'ticketTypeId',
				allowNull: false
			},
			as: 'ticketTypes'
		});
	}

	return SwimmingPoolModel
}
