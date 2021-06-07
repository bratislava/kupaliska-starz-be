import { QueryInterface, DataTypes, UUIDV4, literal } from 'sequelize'
export async function up(queryInterface: QueryInterface) {
	try {
		await queryInterface.createTable('discountCodes', {
			id: {
				type: DataTypes.UUID,
				primaryKey: true,
				allowNull: false,
				defaultValue: UUIDV4,
			},
			code: {
				type: DataTypes.STRING(30),
				allowNull: false,
				unique: true
			},
			amount: {
				type: DataTypes.DECIMAL(10,2),
				allowNull: false
			},
			validFrom: {
				type: DataTypes.DATEONLY,
				allowNull: false,
			},
			validTo: {
				type: DataTypes.DATEONLY,
				allowNull: false,
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

	} catch (err) {
		throw err;
	}
}

export async function down(queryInterface: QueryInterface) {
	await queryInterface.dropTable('discountCodes');
}
