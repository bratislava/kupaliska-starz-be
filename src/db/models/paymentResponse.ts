import {
	DataTypes,
	Sequelize,
	literal,
	UUIDV4
} from 'sequelize'
import { DatabaseModel } from '../../types/models'
import { PaymentOrderModel } from './paymentOrder'

export class PaymentResponseModel extends DatabaseModel {
	id: string
	data: any
	isVerified: boolean // DIGEST && DIGEST1 verification result
	isSuccess: boolean
	// foreign keys
	paymentOrderId: string
	paymentOrder: PaymentOrderModel
}

export default (sequelize: Sequelize) => {
	PaymentResponseModel.init({
		id: {
			type: DataTypes.UUID,
			primaryKey: true,
			allowNull: false,
			defaultValue: UUIDV4,
		},
		data: {
			type: DataTypes.JSON,
			allowNull: false
		},
		isVerified: {
			type: DataTypes.BOOLEAN,
			allowNull: false
		},
		isSuccess: {
			type: DataTypes.BOOLEAN,
			allowNull: false
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
		paranoid: false,
		timestamps: true,
		sequelize,
		modelName: 'paymentResponse'
	})

	PaymentResponseModel.associate = (models) => {
		PaymentResponseModel.belongsTo(models.PaymentOrder, {
			foreignKey: {
				name: 'paymentOrderId',
				allowNull: false
			}
		})
	}

	return PaymentResponseModel
}
