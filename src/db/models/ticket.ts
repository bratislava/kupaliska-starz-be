import { getHours, getMinutes } from './../../utils/helpers'
/* eslint import/no-cycle: 0 */
import { Sequelize, DataTypes, literal, UUIDV4 } from 'sequelize'

import { DatabaseModel } from '../../types/models'
import { getLocalTimezoneTime } from '../../utils/helpers'
import { EntryModel } from './entry'
import { OrderModel } from './order'
import { ProfileModel } from './profile'
import { TicketTypeModel } from './ticketType'
import { TICKET_CATEGORY } from '../../utils/enums'
import { HookReturn } from 'sequelize/types/hooks'

export class TicketModel extends DatabaseModel {
	id: string
	isChildren: boolean
	priceWithVat: number
	vatPercentage: number
	qrCode: string | Buffer
	remainingEntries: number
	// foreign
	profile: ProfileModel
	profileId: string
	ticketType: TicketTypeModel
	ticketTypeId: string
	order: OrderModel
	orderId: string
	parentTicket: TicketModel
	parentTicketId: string
	children: TicketModel[]
	entries: EntryModel[]
	todaysEntries: EntryModel[]
	numberOfVisits: number
	externalAzureId: string
	swimmingLoggedUserId: string
	associatedSwimmerId: string
	// meta
	createdAt: Date
	updatedAt: Date
	deletedAt: Date
	// functions
	canCustomerEnterSwimmingPool(swimmingPoolId: string) {
		for (const allowedPools of this.ticketType.swimmingPools) {
			if (swimmingPoolId === allowedPools.id) {
				return true
			}
		}
		return false
	}

	isBetweenValidDates() {
		const now = new Date()
		const validFrom = new Date(this.ticketType.validFrom)
		validFrom.setHours(0, 0, 0, 0)
		const validTo = new Date(this.ticketType.validTo)
		validTo.setHours(24, 0, 0, 0)

		return now >= validFrom && now <= validTo
	}
	enoughRemainingEntries(firstEntry: EntryModel) {
		if (this.ticketType.isEntries && !firstEntry) {
			return Boolean(this.remainingEntries && this.remainingEntries > 0)
		}
		return true
	}
	checkEntranceContraints() {
		if (this.ticketType.hasEntranceConstraints) {
			// previously the UTC time of container was shifted to fit Bratislava local time
			// now that we are big boys and don't do that this should be the only place where we need to count with local time
			// everything else is still stored and communicated in UTC
			const timeNow = getLocalTimezoneTime()
			return Boolean(
				this.ticketType.entranceFrom &&
					timeNow.localeCompare(this.ticketType.entranceFrom) !==
						-1 &&
					this.ticketType.entranceTo &&
					timeNow.localeCompare(this.ticketType.entranceTo) !== 1
			)
		}
		return true
	}
	checkTicketDuration(firstEntry: EntryModel) {
		if (this.ticketType.hasTicketDuration && firstEntry) {
			const entryTime = new Date(firstEntry.timestamp)

			entryTime.setHours(
				entryTime.getHours() + getHours(this.ticketType.ticketDuration)
			)
			entryTime.setMinutes(
				entryTime.getMinutes() +
					getMinutes(this.ticketType.ticketDuration)
			)

			const now = new Date()
			return now <= entryTime
		}
		return true
	}
	isCustomerLastActionCheckIn(lastEntry: EntryModel) {
		return Boolean(lastEntry && lastEntry.isCheckIn())
	}
	isCustomerLastActionCheckOut(lastEntry: EntryModel) {
		return Boolean(!lastEntry || lastEntry.isCheckOut())
	}
	withAdult() {
		return (
			this.isChildren &&
			this.profile.age <= this.ticketType.childrenAgeToWithAdult
		)
	}
	getCategory() {
		if (this.isChildren) {
			if (this.withAdult()) {
				return TICKET_CATEGORY.CHILDREN_WITH_ADULT
			} else {
				return TICKET_CATEGORY.CHILDREN_WITHOUT_ADULT
			}
			// optionals because of older tickets
		} else if (this?.ticketType?.isSeniorIsDisabled) {
			return TICKET_CATEGORY.SENIOR_OR_DISABLED
		} else {
			return TICKET_CATEGORY.ADULT
		}
	}
}

export default (sequelize: Sequelize) => {
	TicketModel.init(
		{
			id: {
				type: DataTypes.UUID,
				primaryKey: true,
				allowNull: false,
				defaultValue: UUIDV4,
			},
			priceWithVat: {
				type: DataTypes.DECIMAL(10, 2),
				allowNull: false,
				get() {
					const value = this.getDataValue('priceWithVat')
					return value !== undefined ? parseFloat(value) : undefined
				},
			},
			vatPercentage: {
				type: DataTypes.DECIMAL(10, 2),
				allowNull: true,
				get() {
					const value = this.getDataValue('vatPercentage')
					return value !== undefined ? parseFloat(value) : undefined
				},
			},
			isChildren: {
				type: DataTypes.BOOLEAN,
				allowNull: false,
				defaultValue: false,
			},
			externalAzureId: {
				type: DataTypes.UUID,
				allowNull: true,
				defaultValue: null,
			},
			swimmingLoggedUserId: {
				type: DataTypes.UUID,
				allowNull: true,
				defaultValue: null,
			},
			associatedSwimmerId: {
				type: DataTypes.UUID,
				allowNull: true,
				defaultValue: null,
			},
			remainingEntries: {
				type: DataTypes.SMALLINT,
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
			paranoid: true,
			timestamps: true,
			sequelize,
			modelName: 'ticket',
			hooks: {
				beforeFind(options: any): HookReturn {
					options.raw = false
				},
			},
		}
	)

	TicketModel.associate = (models) => {
		TicketModel.belongsTo(models.Profile, {
			foreignKey: {
				name: 'profileId',
				allowNull: false,
			},
			as: 'profile',
		})
		TicketModel.belongsTo(models.Order, {
			foreignKey: {
				name: 'orderId',
				allowNull: false,
			},
			as: 'order',
		})
		TicketModel.belongsTo(models.Ticket, {
			foreignKey: {
				name: 'parentTicketId',
				allowNull: true,
			},
			as: 'parentTicket',
		})
		TicketModel.belongsTo(models.TicketType, {
			foreignKey: {
				name: 'ticketTypeId',
				allowNull: false,
			},
			as: 'ticketType',
		})

		TicketModel.hasMany(models.Ticket, {
			foreignKey: {
				name: 'parentTicketId',
				allowNull: true,
			},
			as: 'children',
		})
		TicketModel.hasMany(models.Entry, {
			foreignKey: {
				name: 'ticketId',
				allowNull: true,
			},
			as: 'entries',
		})
	}

	return TicketModel
}
