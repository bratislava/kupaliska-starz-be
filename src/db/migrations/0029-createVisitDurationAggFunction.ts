import { QueryInterface } from 'sequelize'
export async function up(queryInterface: QueryInterface) {
	try {
		await queryInterface.sequelize.query(`
			CREATE TYPE ENTRY as (
				entry_type varchar(3),
				timestamp TIMESTAMPtz,
				summary integer
			);
		`);

		await queryInterface.sequelize.query(`
			CREATE or replace FUNCTION calculate_visit_duration
				(state ENTRY, entry_timestamp timestamptz, entry_type varchar(3))
				RETURNS ENTRY as
				$BODY$
				begin
					if state.entry_type = 'OUT' then
						return CAST(ROW(entry_type, entry_timestamp, state.summary) as entry);
					else
						if entry_type = 'OUT' then
							return CAST(ROW(entry_type, entry_timestamp, state.summary + extract('epoch' from entry_timestamp) - extract('epoch' from state.timestamp)) as entry);
						else
							return state;
						end if;
					end if;
				end;
				$BODY$
				LANGUAGE plpgsql;
		`);

		await queryInterface.sequelize.query(`
			CREATE FUNCTION visit_duration_final_function (ENTRY)
				RETURNS integer
				LANGUAGE SQL
				AS $$
					SELECT ($1.summary);
				$$;
		`);

		await queryInterface.sequelize.query(`
			CREATE AGGREGATE visit_duration (timestamptz, varchar(3)) (
				initcond = '("OUT","2021-01-01 00:00:00", 0)', -- initial state
				stype = ENTRY, -- this is the type of the state that will be passed between steps
				sfunc = calculate_visit_duration, -- this is the function that knows how to compute sum from existing sum and new element.
				finalfunc = visit_duration_final_function -- returns the result for the aggregate function.
			);
		`);

		return Promise.resolve()

	} catch (err) {
		throw err;
	}
}

export async function down(queryInterface: QueryInterface) {
	await queryInterface.sequelize.query('DROP TYPE ENTRY CASCADE');

	return Promise.resolve()
}
