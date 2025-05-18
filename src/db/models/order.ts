import { PaymentOrderModel } from './paymentOrder'
/* eslint import/no-cycle: 0 */

import { Sequelize, DataTypes, literal, UUIDV4, Op } from 'sequelize'

import { DatabaseModel } from '../../types/models'
import { TicketModel } from './ticket'
import { ORDER_STATE } from '../../utils/enums'
import { reduce } from 'lodash'
import i18next from 'i18next'
import { getChildrenTicketName } from '../../utils/translationsHelpers'
import { DiscountCodeModel } from './discountCode'

export interface OrderItem {
	name: string
	amount: number
	price: string
	accPrice: number
}

export class OrderModel extends DatabaseModel {
	id: string
	price: number
	discount: number
	orderNumber: number
	state: ORDER_STATE
	// foreign
	tickets: TicketModel[]
	parentTicket: TicketModel
	paymentOrder: PaymentOrderModel
	discountCodeId: string
	discountCode: DiscountCodeModel
	// meta
	createdAt: Date
	updatedAt: Date
	deletedAt: Date
	// functions
	isPaid() {
		return this.state === ORDER_STATE.PAID
	}
	getItems() {
		const self = this as OrderModel
		const adults = reduce<TicketModel[], OrderItem>(
			self.tickets,
			(obj: OrderItem, ticket: TicketModel) => {
				return ticket.isChildren === false
					? {
							name: ticket.ticketType.name,
							amount: obj.amount + 1,
							// this should change
							accPrice: obj.accPrice + ticket.priceWithTax,
							price: (obj.accPrice + ticket.priceWithTax).toFixed(
								2
							),
					  }
					: obj
			},
			{ name: '', amount: 0, price: '0.00', accPrice: 0 }
		)

		const children = reduce<TicketModel[], OrderItem>(
			self.tickets,
			(obj: OrderItem, ticket: TicketModel) => {
				return ticket.isChildren
					? {
							name: getChildrenTicketName(),
							amount: obj.amount + 1,
							// this should change
							accPrice: obj.accPrice + ticket.priceWithTax,
							price: (obj.accPrice + ticket.priceWithTax).toFixed(
								2
							),
					  }
					: obj
			},
			{ name: '', amount: 0, price: '0.00', accPrice: 0 }
		)

		const discount = {
			name: i18next.t('discountItem'),
			amount: 1,
			accPrice: -1 * self.discount,
			price: `-${self.discount.toFixed(2)}`,
		}

		return { adults, children, discount }
	}
}

export default (sequelize: Sequelize) => {
	OrderModel.init(
		{
			id: {
				type: DataTypes.UUID,
				primaryKey: true,
				allowNull: false,
				defaultValue: UUIDV4,
			},
			orderNumber: {
				type: DataTypes.BIGINT,
				allowNull: false,
				unique: true,
			},
			state: {
				type: DataTypes.STRING(255),
				allowNull: false,
				defaultValue: ORDER_STATE.CREATED,
			},
			price: {
				type: DataTypes.DECIMAL(10, 2),
				allowNull: false,
				get() {
					const value = this.getDataValue('price')
					return value !== undefined ? parseFloat(value) : undefined
				},
			},
			discount: {
				type: DataTypes.DECIMAL(10, 2),
				allowNull: false,
				defaultValue: 0,
				get() {
					const value = this.getDataValue('discount')
					return value !== undefined ? parseFloat(value) : undefined
				},
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
			paranoid: true,
			timestamps: true,
			sequelize,
			modelName: 'order',
			hooks: {},
		}
	)

	OrderModel.associate = (models) => {
		OrderModel.hasMany(models.Ticket, {
			foreignKey: {
				name: 'orderId',
				allowNull: false,
			},
			as: 'tickets',
		})

		OrderModel.hasOne(models.Ticket, {
			foreignKey: {
				name: 'orderId',
				allowNull: false,
			},
			scope: {
				where: {
					parentTicketId: {
						[Op.is]: null,
					},
				},
			},
			as: 'parentTicket',
		})

		OrderModel.hasOne(models.PaymentOrder, {
			foreignKey: {
				name: 'orderId',
				allowNull: false,
			},
			as: 'paymentOrder',
		})

		OrderModel.belongsTo(models.DiscountCode, {
			foreignKey: {
				name: 'discountCodeId',
				allowNull: true,
			},
			as: 'discountCode',
		})
	}

	return OrderModel
}
