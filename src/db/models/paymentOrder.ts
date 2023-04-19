import { OrderModel } from './order'
import { DataTypes, Sequelize, literal, UUIDV4 } from 'sequelize'
import { DatabaseModel } from '../../types/models'
// eslint-disable-next-line import/no-cycle
import { PaymentResponseModel } from './paymentResponse'

export class PaymentOrderModel extends DatabaseModel {
	id: string
	paymentAmount: number
	// foreign keys
	orderId: string
	order: OrderModel
	paymentResponse: PaymentResponseModel
	// metadata
	createdAt: Date
	updatedAt: Date
}

export default (sequelize: Sequelize) => {
	PaymentOrderModel.init(
		{
			id: {
				type: DataTypes.UUID,
				primaryKey: true,
				allowNull: false,
				defaultValue: UUIDV4,
			},
			paymentAmount: {
				type: DataTypes.DECIMAL(10, 2),
				allowNull: false,
				get() {
					const value = this.getDataValue('paymentAmount')
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
			paranoid: false,
			timestamps: true,
			sequelize,
			modelName: 'paymentOrder',
		}
	)

	PaymentOrderModel.associate = (models) => {
		PaymentOrderModel.belongsTo(models.Order, {
			foreignKey: {
				name: 'orderId',
				allowNull: false,
			},
		})

		PaymentOrderModel.hasOne(models.PaymentResponse, {
			foreignKey: {
				name: 'paymentOrderId',
				allowNull: false,
			},
		})
	}

	return PaymentOrderModel
}
