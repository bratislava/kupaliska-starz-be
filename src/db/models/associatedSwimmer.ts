/* eslint import/no-cycle: 0 */

import { Sequelize, DataTypes, literal, UUIDV4 } from 'sequelize'

import { DatabaseModel } from '../../types/models'
import { FileModel } from './file'

export class AssociatedSwimmerModel extends DatabaseModel {
	id: string
	swimmingLoggedUserId: string
	firstname: string
	lastname: string
	dateOfBirth: Date
	age: number
	zip: string
	image: FileModel
	createdAt: Date
	updatedAt: Date
	deletedAt: Date
	// lastLoginAt: Date
	// functions
}

export default (sequelize: Sequelize) => {
	AssociatedSwimmerModel.init(
		{
			id: {
				type: DataTypes.UUID,
				primaryKey: true,
				allowNull: false,
				defaultValue: UUIDV4,
			},
			firstname: {
				type: DataTypes.STRING(255),
				allowNull: true,
			},
			lastname: {
				type: DataTypes.STRING(255),
				allowNull: true,
			},
			age: {
				type: DataTypes.SMALLINT,
				allowNull: true,
			},
			dateOfBirth: {
				type: DataTypes.DATE,
				allowNull: true,
			},
			zip: {
				type: DataTypes.STRING(10),
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
			deletedAt: {
				type: DataTypes.DATE,
				allowNull: true,
			},
		},
		{
			defaultScope: {
				where: {
					// isConfirmed: true
				},
			},
			paranoid: true,
			timestamps: true,
			sequelize,
			modelName: 'associatedSwimmer',
		}
	)

	AssociatedSwimmerModel.associate = (models) => {
		AssociatedSwimmerModel.belongsTo(models.SwimmingLoggedUser, {
			foreignKey: {
				name: 'swimmingLoggedUserId',
				allowNull: false,
			},
			as: 'swimmingLoggedUser',
		})
		AssociatedSwimmerModel.hasOne(models.File, {
			foreignKey: 'relatedId',
			constraints: false,
			scope: {
				relatedType: 'associatedSwimmer',
			},
			as: 'image',
		})
	}

	return AssociatedSwimmerModel
}
