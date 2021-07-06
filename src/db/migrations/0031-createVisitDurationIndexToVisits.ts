import { QueryInterface } from 'sequelize'
export async function up(queryInterface: QueryInterface) {
	try {

		await queryInterface.sequelize.query('create index "visits_visitDuration" on visits ("visitDuration")');
		return Promise.resolve()

	} catch (err) {
		throw err;
	}
}

export async function down(queryInterface: QueryInterface) {
	await queryInterface.sequelize.query(`
		DROP INDEX "visits_visitDuration";`
	);
	return Promise.resolve()
}
