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
	displayOrder: number
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
			displayOrder: {
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
					if (ticketType.displayOrder === 0) {
						ticketType.displayOrder = ticketTypesCount + 1
					} else {
						validateZod(
							true,
							ticketType.displayOrder,
							z.number().max(ticketTypesCount + 1),
							i18next.t('error:exceededDisplayOrderNumber'),
							'exceededDisplayOrderNumber'
						)

						await TicketTypeModel.update(
							{
								displayOrder:
									Sequelize.literal('displayOrder +1'),
							},
							{
								where: {
									displayOrder: {
										[Op.gte]: ticketType.displayOrder,
									},
								},
								transaction: options.transaction,
								hooks: false,
							}
						)
					}
				},
				beforeUpdate: async (ticketType, options) => {
					const previousDisplayOrder =
						ticketType.previous('displayOrder')

					if (
						ticketType.displayOrder !== 0 &&
						previousDisplayOrder !== ticketType.displayOrder
					) {
						const ticketTypesCount = await TicketTypeModel.count()
						validateZod(
							true,
							ticketType.displayOrder,
							z.number().max(ticketTypesCount),
							i18next.t('error:exceededDisplayOrderNumber'),
							'exceededDisplayOrderNumber'
						)

						let displayOrder: any = {}
						let direction: string
						if (ticketType.displayOrder < previousDisplayOrder) {
							displayOrder = {
								[Op.and]: [
									{
										[Op.gte]: ticketType.displayOrder,
									},
									{
										[Op.lte]: previousDisplayOrder,
									},
								],
							}
							direction = '+1'
						} else {
							displayOrder = {
								[Op.and]: [
									{
										[Op.lte]: ticketType.displayOrder,
									},
									{
										[Op.gt]: previousDisplayOrder,
									},
								],
							}
							direction = '-1'
						}

						await TicketTypeModel.update(
							{
								displayOrder: Sequelize.literal(
									`displayOrder ${direction}`
								),
							},
							{
								where: {
									id: {
										[Op.not]: ticketType.id,
									},
									displayOrder,
								},
								transaction: options.transaction,
								hooks: false,
							}
						)
					} else {
						ticketType.displayOrder = previousDisplayOrder
					}
				},
				beforeDestroy: async (ticketType, options) => {
					await TicketTypeModel.update(
						{
							displayOrder: Sequelize.literal('displayOrder -1'),
						},
						{
							where: {
								displayOrder: {
									[Op.gt]: ticketType.displayOrder,
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
