import { QueryInterface } from 'sequelize'
export async function up(queryInterface: QueryInterface) {
	try {

		await queryInterface.sequelize.query('CREATE EXTENSION unaccent;');
		return Promise.resolve()

	} catch (err) {
		throw err;
	}
}

export async function down(queryInterface: QueryInterface) {
	await queryInterface.sequelize.query(`
		DROP EXTENSION unaccent;`
	);
	return Promise.resolve()
}
