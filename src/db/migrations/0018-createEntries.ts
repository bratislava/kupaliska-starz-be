import { QueryInterface, DataTypes, UUIDV4, literal } from 'sequelize'
export async function up(queryInterface: QueryInterface) {
	try {
		await queryInterface.createTable('entries', {
			id: {
				type: DataTypes.UUID,
				primaryKey: true,
				allowNull: false,
				defaultValue: UUIDV4,
			},
			type: {
				type: DataTypes.STRING(3),
				allowNull: false,
			},
			timestamp: {
				type: DataTypes.DATE,
				allowNull: false,
				defaultValue: literal('NOW()')
			},
			ticketId: {
				type: DataTypes.UUID,
				references: {
					model: "tickets",
					key: "id"
				},
				allowNull: false
			},
			swimmingPoolId: {
				type: DataTypes.UUID,
				references: {
					model: "swimmingPools",
					key: "id"
				},
				allowNull: false
			},
		});

	} catch (err) {
		throw err;
	}
}

export async function down(queryInterface: QueryInterface) {
	await queryInterface.dropTable('entries');
}
