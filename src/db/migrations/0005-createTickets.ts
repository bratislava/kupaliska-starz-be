import { QueryInterface, DataTypes, UUIDV4, literal } from 'sequelize'
export async function up(queryInterface: QueryInterface) {
	try {
		await queryInterface.createTable('tickets', {
			id: {
				type: DataTypes.UUID,
				primaryKey: true,
				allowNull: false,
				defaultValue: UUIDV4,
			},
			price: {
				type: DataTypes.DECIMAL(10, 2),
				allowNull: false,
			},
			isChildren: {
				type: DataTypes.BOOLEAN,
				allowNull: false,
				defaultValue: false
			},
			ticketTypeId: {
				type: DataTypes.UUID,
				references: {
					model: "ticketTypes",
					key: "id"
				},
				allowNull: false
			},
			orderId: {
				type: DataTypes.UUID,
				references: {
					model: "orders",
					key: "id"
				},
				allowNull: false
			},
			profileId: {
				type: DataTypes.UUID,
				references: {
					model: "profiles",
					key: "id"
				},
				allowNull: false
			},
			parentTicketId: {
				type: DataTypes.UUID,
				references: {
					model: "tickets",
					key: "id"
				},
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

	} catch (err) {
		throw err;
	}
}

export async function down(queryInterface: QueryInterface) {
	await queryInterface.dropTable('tickets');
}
