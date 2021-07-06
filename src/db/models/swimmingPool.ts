import { FileModel } from './file';
/* eslint import/no-cycle: 0 */

import {
	Sequelize,
	DataTypes,
	literal,
	UUIDV4,
	Op
} from 'sequelize'

import { DatabaseModel } from '../../types/models'
import { validate } from '../../utils/validation';
import Joi from 'joi';
import i18next from 'i18next';

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
	ordering: number
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
		ordering: {
			type: DataTypes.SMALLINT,
			allowNull: false,
			defaultValue: 0
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
		hooks: {
			beforeCreate: async (swimmingPool, options) => {

				const swimmingPoolsCount = await SwimmingPoolModel.count()
				if (swimmingPool.ordering === 0) {
					swimmingPool.ordering = swimmingPoolsCount + 1
				} else {

					validate(true, swimmingPool.ordering, Joi.number().max(swimmingPoolsCount + 1), i18next.t('error:exceededOrderingNumber'), 'exceededOrderingNumber')

					await SwimmingPoolModel.update({
						ordering: Sequelize.literal('ordering +1')
					}, {
						where: {
							ordering: {
								[Op.gte]: swimmingPool.ordering
							}
						},
						transaction: options.transaction,
						hooks: false,
					})
				}
			},
			beforeUpdate: async (swimmingPool, options) => {
				const previousOrdering = swimmingPool.previous('ordering')

				if (swimmingPool.ordering !== 0 &&
					previousOrdering !== swimmingPool.ordering) {
					const swimmingPoolsCount = await SwimmingPoolModel.count()
					validate(true, swimmingPool.ordering, Joi.number().max(swimmingPoolsCount), i18next.t('error:exceededOrderingNumber'), 'exceededOrderingNumber')

					let ordering :any = {}
					let direction: string
					if (swimmingPool.ordering < previousOrdering) {
						ordering = {
							[Op.and]: [
								{
									[Op.gte]: swimmingPool.ordering,
								},
								{
									[Op.lte]: previousOrdering
								}
							],
						}
						direction = '+1'
					} else {
						ordering = {
							[Op.and]: [
								{
									[Op.lte]: swimmingPool.ordering,
								},
								{
									[Op.gt]: previousOrdering
								}
							],
						}
						direction = '-1'
					}

					await SwimmingPoolModel.update({
						ordering: Sequelize.literal(`ordering ${direction}`)
					}, {
						where: {
							id: {
								[Op.not]: swimmingPool.id
							},
							ordering
						},
						transaction: options.transaction,
						hooks: false,
					})
				} else {
					swimmingPool.ordering = previousOrdering
				}
			},
			beforeDestroy: async (swimmingPool, options) => {
				await SwimmingPoolModel.update({
					ordering: Sequelize.literal('ordering -1')
				}, {
					where: {
						ordering: {
							[Op.gt]: swimmingPool.ordering
						}
					},
					transaction: options.transaction,
					hooks: false,
				})
			},
		}
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

		SwimmingPoolModel.belongsToMany(models.User, {
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

		SwimmingPoolModel.belongsToMany(models.TicketType, {
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
