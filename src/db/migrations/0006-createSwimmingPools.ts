import { QueryInterface, DataTypes, UUIDV4, literal } from 'sequelize'
export async function up(queryInterface: QueryInterface) {
	try {
		await queryInterface.createTable('swimmingPools', {
			id: {
				type: DataTypes.UUID,
				primaryKey: true,
				allowNull: false,
				defaultValue: UUIDV4,
			},
			description: {
				type: DataTypes.STRING(1000),
				allowNull: false
			},
			expandedDescription: {
				type: DataTypes.TEXT,
				allowNull: false
			},
			name: {
				type: DataTypes.STRING(500),
				allowNull: false
			},
			waterTemp: {
				type: DataTypes.SMALLINT,
				allowNull: true
			},
			maxCapacity: {
				type: DataTypes.SMALLINT,
				allowNull: false
			},
			openingHours: {
				type: DataTypes.JSON,
				allowNull: false
			},
			facilities: {
				type: DataTypes.JSON,
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
	await queryInterface.dropTable('swimmingPools');
}
