import { ENTRY_TYPE, ENTRY_FLAG } from './../../utils/enums'
import { SwimmingPoolModel } from './swimmingPool'
/* eslint import/no-cycle: 0 */
import { Sequelize, DataTypes, literal, UUIDV4, Op } from 'sequelize'

import { DatabaseModel } from '../../types/models'
import { TicketModel } from './ticket'
import { UserModel } from './user'

export class EntryModel extends DatabaseModel {
	id: string
	type: ENTRY_TYPE
	flag: ENTRY_FLAG
	// foreign
	ticketId: string
	ticket: TicketModel
	swimmingPoolId: string
	swimmingPool: SwimmingPoolModel
	employeeId: string
	employee: UserModel
	// meta
	timestamp: Date
	// function
	isCheckIn() {
		return this.type === ENTRY_TYPE.CHECKIN
	}
	isCheckOut() {
		return this.type === ENTRY_TYPE.CHECKOUT
	}
}

export default (sequelize: Sequelize) => {
	EntryModel.init(
		{
			id: {
				type: DataTypes.UUID,
				primaryKey: true,
				allowNull: false,
				defaultValue: UUIDV4,
			},
			type: {
				type: DataTypes.STRING(3),
				allowNull: false,
			},
			flag: {
				type: DataTypes.STRING(1),
				allowNull: false,
			},
			timestamp: {
				type: DataTypes.DATE,
				allowNull: false,
				defaultValue: literal('NOW()'),
			},
		},
		{
			timestamps: false,
			sequelize,
			modelName: 'entry',
			hooks: {},
			scopes: {
				manual: {
					where: {
						flag: {
							[Op.eq]: ENTRY_FLAG.MANUAL,
						},
					},
				},
			},
		}
	)

	EntryModel.addScope(
		'timestamp',
		(from = new Date(new Date().setHours(0, 0, 0, 0))) => ({
			where: {
				timestamp: {
					[Op.gt]: from,
				},
			},
		})
	)

	EntryModel.associate = (models) => {
		EntryModel.belongsTo(models.SwimmingPool, {
			foreignKey: {
				name: 'swimmingPoolId',
				allowNull: false,
			},
			as: 'swimmingPool',
		})
		EntryModel.belongsTo(models.Ticket, {
			foreignKey: {
				name: 'ticketId',
				allowNull: false,
			},
			as: 'ticket',
		})

		EntryModel.belongsTo(models.User, {
			foreignKey: {
				name: 'employeeId',
				allowNull: false,
			},
			as: 'employee',
		})
	}

	return EntryModel
}
