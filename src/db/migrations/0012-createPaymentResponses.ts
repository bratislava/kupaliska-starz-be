import { QueryInterface, DataTypes, UUIDV4, literal } from 'sequelize'
export async function up(queryInterface: QueryInterface) {
	try {
		await queryInterface.createTable('paymentResponses', {
			id: {
				type: DataTypes.UUID,
				primaryKey: true,
				allowNull: false,
				defaultValue: UUIDV4,
			},
			data: {
				type: DataTypes.JSON,
				allowNull: false
			},
			isVerified: {
				type: DataTypes.BOOLEAN,
				allowNull: false
			},
			isSuccess: {
				type: DataTypes.BOOLEAN,
				allowNull: false
			},
			paymentOrderId: {
				type: DataTypes.UUID,
				references: {
					model: "paymentOrders",
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
	await queryInterface.dropTable('paymentResponses');
}
