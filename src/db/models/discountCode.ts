/* eslint import/no-cycle: 0 */

import { Sequelize, DataTypes, literal, UUIDV4, Op } from 'sequelize'

import { DatabaseModel } from '../../types/models'
import { OrderModel } from './order'
import { TicketTypeModel } from './ticketType'

export class DiscountCodeModel extends DatabaseModel {
	id: string
	code: string
	amount: number // currently only in percent
	validFrom: Date
	validTo: Date
	ticketTypes: TicketTypeModel[]
	usedAt: Date
	createdAt: Date
	updatedAt: Date
	deletedAt: Date
	// foreign
	order: OrderModel
	// getters
	getInverseAmount: number
}

export default (sequelize: Sequelize) => {
	DiscountCodeModel.init(
		{
			id: {
				type: DataTypes.UUID,
				primaryKey: true,
				allowNull: false,
				defaultValue: UUIDV4,
			},
			code: {
				type: DataTypes.STRING(30),
				allowNull: false,
				unique: true,
			},
			amount: {
				type: DataTypes.DECIMAL(10, 2),
				allowNull: false,
				get() {
					const value = this.getDataValue('amount')
					return value !== undefined ? parseFloat(value) : undefined
				},
			},
			validFrom: {
				type: DataTypes.DATEONLY,
				allowNull: false,
			},
			validTo: {
				type: DataTypes.DATEONLY,
				allowNull: false,
			},
			usedAt: {
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
			getterMethods: {
				getInverseAmount() {
					return 1 - this.amount / 100
				},
			},
			paranoid: true,
			timestamps: true,
			sequelize,
			modelName: 'discountCode',
		}
	)

	DiscountCodeModel.addScope(
		'valid',
		(now = new Date(new Date().setHours(0, 0, 0, 0))) => ({
			where: {
				validFrom: {
					[Op.lte]: now,
				},
				validTo: {
					[Op.gte]: now,
				},
			},
		})
	)

	DiscountCodeModel.addScope('byTicketType', (ticketTypeId) => ({
		include: {
			association: 'ticketTypes',
			attributes: ['id'],
			required: true,
			where: {
				id: {
					[Op.eq]: ticketTypeId,
				},
			},
		},
	}))

	DiscountCodeModel.associate = (models) => {
		DiscountCodeModel.belongsToMany(models.TicketType, {
			through: {
				model: models.DiscountCodeTicketType,
			},
			foreignKey: {
				name: 'discountCodeId',
				allowNull: false,
			},
			otherKey: {
				name: 'ticketTypeId',
				allowNull: false,
			},
			as: 'ticketTypes',
		})

		DiscountCodeModel.hasOne(models.Order, {
			foreignKey: {
				name: 'discountCodeId',
				allowNull: true,
			},
			as: 'order',
		})
	}

	return DiscountCodeModel
}
