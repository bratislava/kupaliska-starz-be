import { QueryInterface, DataTypes, literal } from 'sequelize'
export async function up(queryInterface: QueryInterface) {
	try {
		await queryInterface.createTable('swimmingPoolTicketType', {
			ticketTypeId: {
				type: DataTypes.UUID,
				primaryKey: true,
				allowNull: false,
				references: {
					model: 'ticketTypes',
					key: 'id',
				},
			},
			swimmingPoolId: {
				type: DataTypes.UUID,
				primaryKey: true,
				references: {
					model: 'swimmingPools',
					key: 'id',
				},
				allowNull: false,
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
		})
	} catch (err) {
		throw err
	}
}

export async function down(queryInterface: QueryInterface) {
	await queryInterface.dropTable('swimmingPoolTicketType')
}
