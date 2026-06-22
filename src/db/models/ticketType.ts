import { Sequelize, DataTypes, literal, UUIDV4, Op } from 'sequelize'
import i18next from 'i18next'

import { DatabaseModel } from '../../types/models'
import { TICKET_TYPE } from '../../utils/enums'
import { SwimmingPoolModel } from './swimmingPool'
import { z } from 'zod'
import { validateZod } from '../../utils/validation'

export class TicketTypeModel extends DatabaseModel {
	id: string
	name: string
	description: string
	priceWithVat: number
	vatPercentage: number
	type: TICKET_TYPE
	nameRequired: boolean
	photoRequired: boolean
	swimmingPools: SwimmingPoolModel[]
	// children
	childrenAllowed: boolean
	childrenMaxNumber: number
	childrenPriceWithVat: number
	childrenVatPercentage: number
	childrenAgeFrom: number
	childrenAgeTo: number
	childrenAgeToWithAdult: number
	childrenPhotoRequired: boolean
	validFrom: Date
	validTo: Date
	isSeniorIsDisabled: boolean
	hasEntranceConstraints: boolean
	entranceFrom: string
	entranceTo: string
	hasTicketDuration: boolean
	ticketDuration: string
	ordering: number
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
		const now = new Date()
		const validTo = new Date(this.validTo)
		validTo.setHours(24, 0, 0, 0)
		return validTo.getTime() - now.getTime()
	}
}

export default (sequelize: Sequelize) => {
	TicketTypeModel.init(
		{
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
			priceWithVat: {
				type: DataTypes.INTEGER,
				allowNull: false,
			},
			vatPercentage: {
				type: DataTypes.DECIMAL(10, 2),
				allowNull: false,
				get() {
					const value = this.getDataValue('vatPercentage')
					return value !== undefined ? parseFloat(value) : undefined
				},
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
				allowNull: false,
			},
			childrenMaxNumber: {
				type: DataTypes.SMALLINT,
				allowNull: true,
			},
			childrenPriceWithVat: {
				type: DataTypes.INTEGER,
				allowNull: true,
			},
			childrenVatPercentage: {
				type: DataTypes.DECIMAL(10, 2),
				allowNull: true,
				get() {
					const value = this.getDataValue('childrenVatPercentage')
					return value !== undefined ? parseFloat(value) : undefined
				},
			},
			childrenAgeFrom: {
				type: DataTypes.SMALLINT,
				allowNull: true,
			},
			childrenAgeTo: {
				type: DataTypes.SMALLINT,
				allowNull: true,
			},
			childrenAgeToWithAdult: {
				type: DataTypes.SMALLINT,
				allowNull: true,
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
			isSeniorIsDisabled: {
				type: DataTypes.BOOLEAN,
				allowNull: false,
			},
			hasTicketDuration: {
				type: DataTypes.BOOLEAN,
				allowNull: false,
				defaultValue: false,
			},
			ticketDuration: {
				type: DataTypes.TIME,
				allowNull: true,
				get() {
					const rawValue = this.getDataValue('ticketDuration')
					return rawValue
						? rawValue.substring(0, rawValue.length - 3)
						: null
				},
			},
			ordering: {
				type: DataTypes.SMALLINT,
				allowNull: false,
				defaultValue: 0,
			},
			entriesNumber: {
				type: DataTypes.SMALLINT,
				allowNull: true,
			},
			hasEntranceConstraints: {
				type: DataTypes.BOOLEAN,
				allowNull: false,
				defaultValue: false,
			},
			entranceFrom: {
				type: DataTypes.TIME,
				allowNull: true,
				get() {
					const rawValue = this.getDataValue('entranceFrom')
					return rawValue
						? rawValue.substring(0, rawValue.length - 3)
						: null
				},
			},
			entranceTo: {
				type: DataTypes.TIME,
				allowNull: true,
				get() {
					const rawValue = this.getDataValue('entranceTo')
					return rawValue
						? rawValue.substring(0, rawValue.length - 3)
						: null
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
			modelName: 'ticketType',
			getterMethods: {
				isDisposable() {
					return (
						this.type === TICKET_TYPE.ENTRIES &&
						this.entriesNumber === 1
					)
				},
				isSeasonal() {
					return this.type === TICKET_TYPE.SEASONAL
				},
				isEntries() {
					return this.type === TICKET_TYPE.ENTRIES
				},
			},
			hooks: {
				beforeCreate: async (ticketType, options) => {
					const ticketTypesCount = await TicketTypeModel.count()
					if (ticketType.ordering === 0) {
						ticketType.ordering = ticketTypesCount + 1
					} else {
						validateZod(
							true,
							ticketType.ordering,
							z.number().max(ticketTypesCount + 1),
							i18next.t('error:exceededOrderingNumber'),
							'exceededOrderingNumber'
						)

						await TicketTypeModel.update(
							{
								ordering: Sequelize.literal('ordering +1'),
							},
							{
								where: {
									ordering: {
										[Op.gte]: ticketType.ordering,
									},
								},
								transaction: options.transaction,
								hooks: false,
							}
						)
					}
				},
				beforeUpdate: async (ticketType, options) => {
					const previousOrdering = ticketType.previous('ordering')

					if (
						ticketType.ordering !== 0 &&
						previousOrdering !== ticketType.ordering
					) {
						const ticketTypesCount = await TicketTypeModel.count()
						validateZod(
							true,
							ticketType.ordering,
							z.number().max(ticketTypesCount),
							i18next.t('error:exceededOrderingNumber'),
							'exceededOrderingNumber'
						)

						let ordering: any = {}
						let direction: string
						if (ticketType.ordering < previousOrdering) {
							ordering = {
								[Op.and]: [
									{
										[Op.gte]: ticketType.ordering,
									},
									{
										[Op.lte]: previousOrdering,
									},
								],
							}
							direction = '+1'
						} else {
							ordering = {
								[Op.and]: [
									{
										[Op.lte]: ticketType.ordering,
									},
									{
										[Op.gt]: previousOrdering,
									},
								],
							}
							direction = '-1'
						}

						await TicketTypeModel.update(
							{
								ordering: Sequelize.literal(
									`ordering ${direction}`
								),
							},
							{
								where: {
									id: {
										[Op.not]: ticketType.id,
									},
									ordering,
								},
								transaction: options.transaction,
								hooks: false,
							}
						)
					} else {
						ticketType.ordering = previousOrdering
					}
				},
				beforeDestroy: async (ticketType, options) => {
					await TicketTypeModel.update(
						{
							ordering: Sequelize.literal('ordering -1'),
						},
						{
							where: {
								ordering: {
									[Op.gt]: ticketType.ordering,
								},
							},
							transaction: options.transaction,
							hooks: false,
						}
					)
				},
			},
		}
	)

	TicketTypeModel.associate = (models) => {
		TicketTypeModel.hasMany(models.Ticket, {
			foreignKey: {
				name: 'ticketTypeId',
				allowNull: false,
			},
			as: 'tickets',
		})

		TicketTypeModel.belongsToMany(models.SwimmingPool, {
			through: {
				model: models.SwimmingPoolTicketType,
			},
			foreignKey: {
				name: 'ticketTypeId',
				allowNull: false,
			},
			otherKey: {
				name: 'swimmingPoolId',
				allowNull: false,
			},
			as: 'swimmingPools',
		})

		TicketTypeModel.hasMany(models.SwimmingPoolTicketType, {
			foreignKey: {
				name: 'ticketTypeId',
				allowNull: false,
			},
			as: 'swimingPoolTicketType',
		})
	}

	return TicketTypeModel
}
