import {
	DataTypes,
	Sequelize,
	literal,
	UUIDV4
} from 'sequelize'
import { DatabaseModel } from '../../types/models'
import { ProfileModel } from './profile'

export class FileModel extends DatabaseModel {
	id: string
	name: string
	originalPath: string
	thumbnailSizePath: string
	smallSizePath: string
	mediumSizePath: string
	largeSizePath: string
	mimeType: string
	altText: string
	// foreing
	related: ProfileModel
	relatedType: string
	relatedId: string
	// meta
	createdAt: Date
	updatedAt: Date
}

export default (sequelize: Sequelize) => {
	FileModel.init({
		id: {
			type: DataTypes.UUID,
			primaryKey: true,
			allowNull: false,
			defaultValue: UUIDV4,
		},
		name: {
			type: DataTypes.STRING(255),
			allowNull: false
		},
		originalPath: {
			type: DataTypes.TEXT,
			allowNull: false
		},
		thumbnailSizePath: {
			type: DataTypes.TEXT,
			allowNull: true
		},
		smallSizePath: {
			type: DataTypes.TEXT,
			allowNull: true
		},
		mediumSizePath: {
			type: DataTypes.TEXT,
			allowNull: true
		},
		largeSizePath: {
			type: DataTypes.TEXT,
			allowNull: true
		},
		altText: {
			type: DataTypes.STRING(255),
			allowNull: true
		},
		mimeType: {
			type: DataTypes.TEXT,
			allowNull: true
		},
		size: {
			type: DataTypes.INTEGER,
			allowNull: true
		},
		relatedId: {
			type: DataTypes.UUID,
			allowNull: false,
		},
		relatedType: {
			type: DataTypes.STRING,
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
		modelName: 'file'
	})

	FileModel.associate = (models) => {
		FileModel.belongsTo(models.Profile, {
			foreignKey: 'relatedId',
			constraints: false
		})
	}

	FileModel.associate = (models) => {
		FileModel.belongsTo(models.SwimmingPool, {
			foreignKey: 'relatedId',
			constraints: false
		})
	}

	return FileModel
}
