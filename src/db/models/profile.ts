import { FileModel } from './file'
/* eslint import/no-cycle: 0 */

import { Sequelize, DataTypes, literal, UUIDV4 } from 'sequelize'

import { DatabaseModel } from '../../types/models'

export class ProfileModel extends DatabaseModel {
	id: string
	email: string
	name: string
	age: number
	zip: string
	photo: FileModel
	createdAt: Date
	updatedAt: Date
	deletedAt: Date
}

export default (sequelize: Sequelize) => {
	ProfileModel.init(
		{
			id: {
				type: DataTypes.UUID,
				primaryKey: true,
				allowNull: false,
				defaultValue: UUIDV4,
			},
			email: {
				type: DataTypes.STRING(255),
				allowNull: false,
			},
			name: {
				type: DataTypes.STRING(255),
				allowNull: true,
			},
			age: {
				type: DataTypes.SMALLINT,
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
		},
		{
			paranoid: true,
			timestamps: true,
			sequelize,
			modelName: 'profile',
			hooks: {},
		}
	)
	ProfileModel.associate = (models) => {
		ProfileModel.hasOne(models.File, {
			foreignKey: 'relatedId',
			constraints: false,
			scope: {
				relatedType: 'profile',
			},
			as: 'photo',
		})
	}

	return ProfileModel
}
