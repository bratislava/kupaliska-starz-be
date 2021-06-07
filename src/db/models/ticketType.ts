import {
	Sequelize,
	DataTypes,
	literal,
	UUIDV4
} from 'sequelize'

import { DatabaseModel } from '../../types/models'
import { TICKET_TYPE } from '../../utils/enums'
import { SwimmingPoolModel } from './swimmingPool'

export class TicketTypeModel extends DatabaseModel {
	id: string
	name: string
	description: string
	price: number
	type: TICKET_TYPE
	nameRequired: boolean
	photoRequired: boolean
	swimmingPools: SwimmingPoolModel[]
	// children
	childrenAllowed: boolean
	childrenMaxNumber: number
	childrenPrice: number
	childrenAgeFrom: number
	childrenAgeTo: number
	childrenAgeToWithAdult: number
	childrenPhotoRequired: boolean
	validFrom: Date
	validTo: Date
	hasEntranceConstraints: boolean
	entranceFrom: string
	entranceTo: string
	hasTicketDuration: boolean
	ticketDuration: string
	// entrances ticket
	entriesNumber: number
	// meta
	createdAt: Date
	updatedAt: Date
	deletedAt: Date
	// getters
	isDisposable: boolean
	isSeasonal: boolean
	isEntries: boolean
	// custom functions
	getExpiresIn() {
		const now = new Date();
		const validTo = new Date(this.validTo)
		validTo.setHours(24, 0, 0, 0)
		return (validTo.getTime() - now.getTime());
	}
}

export default (sequelize: Sequelize) => {
	TicketTypeModel.init({
		id: {
			type: DataTypes.UUID,
			primaryKey: true,
			allowNull: false,
			defaultValue: UUIDV4,
		},
		name: {
			type: DataTypes.STRING(255),
			allowNull: false,
		},
		description: {
			type: DataTypes.TEXT,
			allowNull: true,
		},
		price: {
			type: DataTypes.DECIMAL(10, 2),
			allowNull: false,
			get() {
				const value = this.getDataValue('price');
				return value ? parseFloat(value) : undefined;
			}
		},
		type: {
			type: DataTypes.STRING(255),
			allowNull: false,
		},
		nameRequired: {
			type: DataTypes.BOOLEAN,
			allowNull: false,
		},
		photoRequired: {
			type: DataTypes.BOOLEAN,
			allowNull: false,
		},
		childrenAllowed: {
			type: DataTypes.BOOLEAN,
			allowNull: false
		},
		childrenMaxNumber: {
			type: DataTypes.SMALLINT,
			allowNull: true
		},
		childrenPrice: {
			type: DataTypes.DECIMAL(10, 2),
			allowNull: true,
			get() {
				const value = this.getDataValue('childrenPrice');
				return value ? parseFloat(value) : undefined;
			}
		},
		childrenAgeFrom: {
			type: DataTypes.SMALLINT,
			allowNull: true
		},
		childrenAgeTo: {
			type: DataTypes.SMALLINT,
			allowNull: true
		},
		childrenAgeToWithAdult: {
			type: DataTypes.SMALLINT,
			allowNull: true
		},
		childrenPhotoRequired: {
			type: DataTypes.BOOLEAN,
			allowNull: true,
		},
		validFrom: {
			type: DataTypes.DATEONLY,
			allowNull: false,
		},
		validTo: {
			type: DataTypes.DATEONLY,
			allowNull: false,
		},
		hasTicketDuration: {
			type: DataTypes.BOOLEAN,
			allowNull: false,
			defaultValue: false
		},
		ticketDuration: {
			type: DataTypes.TIME,
			allowNull: true,
			get() {
				const rawValue = this.getDataValue('ticketDuration');
				return rawValue ? rawValue.substring(0, rawValue.length - 3) : null;
			}
		},
		entriesNumber: {
			type: DataTypes.SMALLINT,
			allowNull: true
		},
		hasEntranceConstraints: {
			type: DataTypes.BOOLEAN,
			allowNull: false,
			defaultValue: false
		},
		entranceFrom: {
			type: DataTypes.TIME,
			allowNull: true,
			get() {
				const rawValue = this.getDataValue('entranceFrom');
				return rawValue ? rawValue.substring(0, rawValue.length - 3) : null;
			}
		},
		entranceTo: {
			type: DataTypes.TIME,
			allowNull: true,
			get() {
				const rawValue = this.getDataValue('entranceTo');
				return rawValue ? rawValue.substring(0, rawValue.length - 3) : null;
			}
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
		modelName: 'ticketType',
		getterMethods: {
			isDisposable() {
				return this.type === TICKET_TYPE.ENTRIES && this.entriesNumber === 1
			},
			isSeasonal() {
				return this.type === TICKET_TYPE.SEASONAL
			},
			isEntries() {
				return this.type === TICKET_TYPE.ENTRIES
			},
		},
		hooks: {
		}
	})

	TicketTypeModel.associate = (models) => {
		TicketTypeModel.hasMany(models.Ticket, {
			foreignKey: {
				name: 'ticketTypeId',
				allowNull: false
			},
			as: 'tickets'
		})

		TicketTypeModel.belongsToMany(models.SwimmingPool, {
			through: {
				model: models.SwimmingPoolTicketType
			},
			foreignKey: {
				name: 'ticketTypeId',
				allowNull: false
			},
			otherKey: {
				name: 'swimmingPoolId',
				allowNull: false
			},
			as: 'swimmingPools'
		});

		TicketTypeModel.hasMany(models.SwimmingPoolTicketType, {
			foreignKey: {
				name: 'ticketTypeId',
				allowNull: false
			},
			as: 'swimingPoolTicketType'
		})
	}

	return TicketTypeModel
}
