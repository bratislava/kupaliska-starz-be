import { QueryInterface, DataTypes, UUIDV4, literal } from 'sequelize'
export async function up(queryInterface: QueryInterface) {
	try {
		await queryInterface.createTable('generalInformations', {
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
				allowNull: false,
			},
			mainImageMobileAddress: {
				type: DataTypes.TEXT,
				allowNull: false,
			},
			logoAddress: {
				type: DataTypes.TEXT,
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
		})
	} catch (err) {
		throw err
	}
}

export async function down(queryInterface: QueryInterface) {
	await queryInterface.dropTable('generalInformations')
}
