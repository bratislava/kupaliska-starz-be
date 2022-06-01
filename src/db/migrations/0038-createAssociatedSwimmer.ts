import { QueryInterface, DataTypes, UUIDV4, literal } from 'sequelize'

export async function up(queryInterface: QueryInterface) {
	try {
		await queryInterface.createTable('associatedSwimmers', {
			id: {
				type: DataTypes.UUID,
				primaryKey: true,
				allowNull: false,
				defaultValue: UUIDV4,
			},
			swimmingLoggedUserId: {
				type: DataTypes.UUID,
				references: {
					model: 'swimmingLoggedUsers',
					key: 'id',
				},
				allowNull: false,
			},
			surname: {
				type: DataTypes.STRING(255),
				allowNull: true,
			},
			lastname: {
				type: DataTypes.STRING(255),
				allowNull: true,
			},
			zip: {
				type: DataTypes.STRING(10),
				allowNull: true,
			},
			age: {
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
	await queryInterface.dropTable('associatedSwimmers')
}
