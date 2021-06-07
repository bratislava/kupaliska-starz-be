import { QueryInterface, DataTypes, UUIDV4, literal } from 'sequelize'
export async function up(queryInterface: QueryInterface) {
	try {
		await queryInterface.createTable('files', {
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
		});

	} catch (err) {
		throw err;
	}
}

export async function down(queryInterface: QueryInterface) {
    await queryInterface.dropTable('files');
}
