import { QueryInterface } from 'sequelize'
export async function up(queryInterface: QueryInterface) {
    try {

        await queryInterface.sequelize.query(`
            DROP MATERIALIZED VIEW customers;
        `)

        await queryInterface.sequelize.query(`
            CREATE MATERIALIZED VIEW customers AS
            SELECT
                "subq"."email" AS "customerEmail",
                array_agg(DISTINCT("subq"."age")) AS "customerAgesArr",
                string_agg(DISTINCT(BTRIM(CAST("subq"."age" AS VARCHAR))), ', ') AS "customerAges",
                string_agg(DISTINCT(REGEXP_REPLACE("subq"."zip", '\s', '', 'g')), ', ') AS "customerZips",
                array_agg(DISTINCT(REGEXP_REPLACE("subq"."zip", '\s', '', 'g'))) AS "customerZipsArr",
                string_agg(DISTINCT(UNACCENT(INITCAP(BTRIM("subq"."name")))), ', ') AS "customerNames",
                COUNT(DISTINCT "subq"."orderId") AS "orderCount",
                MAX("subq"."orderCreatedAt") AS "lastOrderAt",
                MAX("subq"."lastEntryAt") AS "lastEntryAt",
                array_agg(DISTINCT("subq"."swimmingPoolId")) AS "swimmingPoolsArr",
                COUNT(distinct "subq"."ticketId") as "numberOfTickets"
            FROM
                (
                    SELECT
                        "order"."createdAt" as "orderCreatedAt",
                        "order"."id" as "orderId",
                        "profile"."email",
                        "profile".age,
                        "profile"."zip",
                        "profile"."name",
                        "entries"."timestamp" as "lastEntryAt",
                        "ticket"."id" as "ticketId",
                        "swimmingPoolTicketTypes"."swimmingPoolId" as "swimmingPoolId"
                    FROM "profiles" as "profile"
                    LEFT JOIN "tickets" as "ticket" ON "ticket"."profileId" = "profile"."id"
                    LEFT JOIN "ticketTypes" as "ticketType" ON "ticket"."ticketTypeId" = "ticketType"."id"
                    LEFT JOIN "swimmingPoolTicketType" as "swimmingPoolTicketTypes" ON "swimmingPoolTicketTypes"."ticketTypeId" = "ticketType"."id"
                    LEFT JOIN "entries" AS "entries" ON "ticket"."id" = "entries"."ticketId" AND "entries"."type" = 'IN'
                    LEFT JOIN "orders" AS "order" ON "ticket"."orderId" = "order"."id" AND ("order"."deletedAt" IS NULL)
                    WHERE "profile"."deletedAt" IS NULL and "ticket"."deletedAt" IS null
                ) as subq
            GROUP BY "subq"."email"`
        );

        return Promise.resolve()

    } catch (err) {
        throw err;
    }
}

export async function down(queryInterface: QueryInterface) {
    
    await queryInterface.sequelize.query(`
		DROP MATERIALIZED VIEW customers;`
    );

    await queryInterface.sequelize.query(`

    
        CREATE MATERIALIZED VIEW customers AS
        SELECT
            "subq"."email" AS "customerEmail",
            array_agg(DISTINCT("subq"."age")) AS "customerAgesArr",
            string_agg(DISTINCT(BTRIM(CAST("subq"."age" AS VARCHAR))), ', ') AS "customerAges",
            string_agg(DISTINCT(REGEXP_REPLACE("subq"."zip", '\s', '', 'g')), ', ') AS "customerZips",
            string_agg(DISTINCT(UNACCENT(INITCAP(BTRIM("subq"."name")))), ', ') AS "customerNames",
            COUNT(DISTINCT "subq"."orderId") AS "orderCount",
            MAX("subq"."orderCreatedAt") AS "lastOrderAt",
            MAX("subq"."lastEntryAt") AS "lastEntryAt"
        FROM
            (
                SELECT
                    "order"."createdAt" as "orderCreatedAt",
                    "order"."id" as "orderId",
                    "profile"."email",
                    "profile".age,
                    "profile"."zip",
                    "profile"."name",
                    "entries"."timestamp" as "lastEntryAt"
                FROM "profiles" as "profile"
                LEFT JOIN "tickets" as "ticket" ON "ticket"."profileId" = "profile"."id"
                LEFT JOIN "entries" AS "entries" ON "ticket"."id" = "entries"."ticketId" AND "entries"."type" = 'IN'
                LEFT JOIN "orders" AS "order" ON "ticket"."orderId" = "order"."id" AND ("order"."deletedAt" IS NULL)
                WHERE "profile"."deletedAt" IS NULL and "ticket"."deletedAt" IS null
            ) as subq
        GROUP BY "subq"."email"`
    )
    return Promise.resolve()
}
