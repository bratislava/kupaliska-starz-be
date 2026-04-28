/* eslint import/no-cycle: 0 */

import { Sequelize, DataTypes, literal, UUIDV4, Op } from 'sequelize'

import { DatabaseModel } from '../../types/models'
import { OrderModel } from './order'
import { TicketTypeModel } from './ticketType'
import { getInverseDiscountInPercent } from '../../utils/helpers'

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
			orderId: {
				type: DataTypes.UUID,
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
					// i would like to call getter method of amount instead of this.amount, check later
					return getInverseDiscountInPercent(this.amount)
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

		DiscountCodeModel.belongsTo(models.Order, {
			foreignKey: {
				name: 'orderId',
				allowNull: true,
			},
			as: 'order',
		})
	}

	return DiscountCodeModel
}
