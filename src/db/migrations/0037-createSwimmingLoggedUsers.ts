import { QueryInterface, DataTypes, UUIDV4, literal } from 'sequelize'

export async function up(queryInterface: QueryInterface) {
	try {
		await queryInterface.createTable('swimmingLoggedUsers', {
			id: {
				type: DataTypes.UUID,
				primaryKey: true,
				allowNull: false,
				defaultValue: UUIDV4,
			},
			externalId: {
				type: DataTypes.UUID,
				allowNull: false,
				unique: true,
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
			deletedAt: {
				type: DataTypes.DATE,
				allowNull: true,
			},
		})

		await queryInterface.addConstraint('swimmingLoggedUsers', {
			fields: ['externalId'],
			type: 'unique',
			name: 'swimmingLoggedUser_unique_contraint',
		})
	} catch (err) {
		throw err
	}
}

export async function down(queryInterface: QueryInterface) {
	await queryInterface.dropTable('swimmingLoggedUsers')
}
