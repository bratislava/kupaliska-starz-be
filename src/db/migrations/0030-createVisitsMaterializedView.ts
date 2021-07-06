import { QueryInterface } from 'sequelize'
export async function up(queryInterface: QueryInterface) {
	try {

		await queryInterface.sequelize.query(`
			CREATE MATERIALIZED VIEW visits AS
			SELECT "ticketId", "swimmingPoolId", CAST("timestamp" as date) as "day",
				visit_duration("timestamp", "type" ORDER BY "timestamp" ) / 1000 as "visitDuration",
				count("entries"."id") FILTER (WHERE "type" = 'IN') as "numberOfCheckIn"
			FROM
				"entries"
			GROUP BY
				CAST("timestamp" as date), "ticketId", "swimmingPoolId"`
		);

		return Promise.resolve()

	} catch (err) {
		throw err;
	}
}

export async function down(queryInterface: QueryInterface) {
	await queryInterface.sequelize.query(`
		DROP MATERIALIZED VIEW visits;`
	);
	return Promise.resolve()
}
