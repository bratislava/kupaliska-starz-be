import { QueryInterface } from 'sequelize'

import sequelize from '../../models';

export async function up(queryInterface: QueryInterface) {
	await sequelize.query('SELECT setval(\'"orders_orderNumber_seq"\', 25000)')
}

export async function down(queryInterface: QueryInterface) {
	await sequelize.query('SELECT setval(\'"orders_orderNumber_seq"\', 1)')
}
