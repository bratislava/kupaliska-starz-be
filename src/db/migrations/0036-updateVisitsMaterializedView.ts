import { QueryInterface } from 'sequelize'
export async function up(queryInterface: QueryInterface) {
    try {

        await queryInterface.sequelize.query(`
            DROP MATERIALIZED VIEW visits;
        `)

        await queryInterface.sequelize.query(`
			CREATE MATERIALIZED VIEW visits AS
			SELECT *, ROW_NUMBER() OVER (PARTITION BY "ticketId", day ORDER BY "firstCheckIn") as "checkInOrder"
			FROM
				(
					SELECT "ticketId", "swimmingPoolId", CAST("timestamp" as date) as "day",
						visit_duration("timestamp", "type" ORDER BY "timestamp" ) / 1000 as "visitDuration",
						count("entries"."id") FILTER (WHERE "type" = 'IN') as "numberOfCheckIn",
						min(timestamp) filter (WHERE "type" = 'IN') as "firstCheckIn"
					FROM
						"entries"
					GROUP BY
						CAST("timestamp" as date), "ticketId", "swimmingPoolId"
				) as visits`
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
}
