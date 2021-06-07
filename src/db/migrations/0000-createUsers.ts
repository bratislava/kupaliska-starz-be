import { QueryInterface, DataTypes, UUIDV4, literal } from 'sequelize'
export async function up(queryInterface: QueryInterface) {
	try {
		await queryInterface.createTable('users', {
			id: {
				type: DataTypes.UUID,
				primaryKey: true,
				allowNull: false,
				defaultValue: UUIDV4,
			},
			email: {
				type: DataTypes.STRING(255),
				allowNull: false,
				unique: true
			},
			name: {
				type: DataTypes.STRING(500),
				allowNull: false
			},
			hash: {
				type: DataTypes.TEXT,
				allowNull: false
			},
			issuedTokens: {
				type: DataTypes.INTEGER,
				defaultValue: 0,
				allowNull: false
			},
			tokenValidFromNumber: {
				type: DataTypes.INTEGER,
				defaultValue: 0,
				allowNull: false
			},
			role: {
				type: DataTypes.STRING(50),
				allowNull: false
			},
			isConfirmed: {
				type: DataTypes.BOOLEAN,
				defaultValue: false,
				allowNull: false
			},
			lastLoginAt: {
				type: DataTypes.DATE,
				allowNull: true
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
			},
			deletedAt: {
				type: DataTypes.DATE,
				allowNull: true,
			}
		});

		await queryInterface.addConstraint('users', {
			fields: ['email'],
			type: 'unique',
			name: 'users_unique_contraint'
		});

	} catch (err) {
		throw err;
	}
}

export async function down(queryInterface: QueryInterface) {
    await queryInterface.dropTable('users');
}
