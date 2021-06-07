import { QueryInterface, DataTypes, literal } from 'sequelize'
export async function up(queryInterface: QueryInterface) {
	try {
		await queryInterface.createTable('discountCodeTicketType', {
			ticketTypeId: {
				type: DataTypes.UUID,
				primaryKey: true,
				allowNull: false,
				references: {
					model: "ticketTypes",
					key: "id"
				},
			},
			discountCodeId: {
				type: DataTypes.UUID,
				primaryKey: true,
				references: {
					model: "discountCodes",
					key: "id"
				},
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
		});

	} catch (err) {
		throw err;
	}
}

export async function down(queryInterface: QueryInterface) {
	await queryInterface.dropTable('discountCodeTicketType');
}
