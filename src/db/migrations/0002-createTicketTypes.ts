import { QueryInterface, DataTypes, UUIDV4, literal } from 'sequelize'
export async function up(queryInterface: QueryInterface) {
	try {
		await queryInterface.createTable('ticketTypes', {
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
			ageFrom: {
				type: DataTypes.SMALLINT,
				allowNull: false,
			},
			ageTo: {
				type: DataTypes.SMALLINT,
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
			childrenPrice: {
				type: DataTypes.DECIMAL(10, 2),
				allowNull: true,
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
				allowNull: true,
			},
			validTo: {
				type: DataTypes.DATEONLY,
				allowNull: true,
			},
			displayProperties: {
				type: DataTypes.TEXT,
				allowNull: false,
			},
			childrenDisplayProperties: {
				type: DataTypes.TEXT,
				allowNull: true,
			},
			entriesNumber: {
				type: DataTypes.SMALLINT,
				allowNull: true,
			},
			entranceFrom: {
				type: DataTypes.TIME,
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
		})
	} catch (err) {
		throw err
	}
}

export async function down(queryInterface: QueryInterface) {
	await queryInterface.dropTable('ticketTypes')
}
