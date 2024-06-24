/* eslint import/no-cycle: 0 */

import { Sequelize, DataTypes, literal, UUIDV4 } from 'sequelize'

import { DatabaseModel } from '../../types/models'

export class GeneralInformationModel extends DatabaseModel {
	id: string
	alertText: string
	alertTextColor: string
	alertColor: string
	seasonTitle: string
	seasonSubtitle: string
	isOffSeason: boolean
	offSeasonTitle: string
	offSeasonSubtitle: string
	mainImageAddress: string
	logoAddress: string
	createdAt: Date
	updatedAt: Date
	deletedAt: Date
}

export default (sequelize: Sequelize) => {
	GeneralInformationModel.init(
		{
			id: {
				type: DataTypes.UUID,
				primaryKey: true,
				allowNull: false,
				defaultValue: UUIDV4,
			},
			alertText: {
				type: DataTypes.STRING(255),
				allowNull: false,
				unique: true,
			},
			alertTextColor: {
				type: DataTypes.STRING(255),
				allowNull: false,
				unique: true,
			},
			alertColor: {
				type: DataTypes.STRING(255),
				allowNull: false,
				unique: true,
			},
			seasonTitle: {
				type: DataTypes.TEXT,
				allowNull: false,
			},
			seasonSubtitle: {
				type: DataTypes.TEXT,
				allowNull: false,
			},
			isOffSeason: {
				type: DataTypes.BOOLEAN,
				allowNull: false,
			},
			offSeasonTitle: {
				type: DataTypes.TEXT,
				allowNull: false,
			},
			offSeasonSubtitle: {
				type: DataTypes.TEXT,
				allowNull: false,
			},
			mainImageAddress: {
				type: DataTypes.TEXT,
				defaultValue: 0,
				allowNull: false,
			},
			logoAddress: {
				type: DataTypes.TEXT,
				defaultValue: 0,
				allowNull: false,
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
			deletedAt: {
				type: DataTypes.DATE,
				allowNull: true,
			},
		},
		{
			paranoid: true,
			timestamps: true,
			sequelize,
			modelName: 'generalInformation',
		}
	)

	return GeneralInformationModel
}
