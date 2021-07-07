import Joi from "joi";
import { QueryTypes } from "sequelize";
import { NextFunction, Request, Response } from "express";
import { find, map, reduce } from "lodash";
import config from "config";
import sequelize, { models } from "../../../db/models";
import { TICKET_TYPE } from "../../../utils/enums";
import { getFilters } from "../../../utils/dbFilters";
import { IAppConfig } from "../../../types/interfaces";

const appConfig: IAppConfig = config.get("app");

const { SwimmingPool } = models;

export const schema = Joi.object().keys({
	body: Joi.object(),
	query: Joi.object().keys({
		swimmingPools: Joi.array()
			.min(1)
			.required()
			.items(
				Joi.string()
					.guid({ version: ["uuidv4"] })
					.required()
			),
		multipleEntries: Joi.boolean().default(false),
		day: Joi.object().keys({
			from: Joi.date(),
			to: Joi.date().when("type", {
				is: Joi.valid("range"),
				then: Joi.when("from", {
					is: Joi.required(),
					otherwise: Joi.required(),
				}),
			}),
			type: Joi.string().valid("range").default("range"),
			dataType: Joi.string().default("date"),
		}),
	}),
	params: Joi.object(),
});

interface SwimmingPoolRecord {
	id: string;
	name: string;
	numberOfUses: number;
}

interface TicketTypeRecord {
	ticketTypeName: string;
	isChildren: boolean;
	price: string;
	entryPrice: string;
	numberOfUses: number;
	swimmingPools: SwimmingPoolRecord[];
}

export const workflow = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	try {
		const { query }: any = req;

		const [swimmingPoolsFilterVariables, swimmingPoolsFilterSql] =
			getFilters({
				swimmingPoolId: { type: "in", value: query.swimmingPools },
			});

		const [dayFilterVariables, dayFilterSQL] = getFilters({
			day: query.day,
		});

		const computeRealPriceSql = `
			CASE
				WHEN dc.amount IS NULL
				THEN tickets.price
				ELSE (tickets.price * (1 - dc.amount / 100))
			END AS "realPrice"`;

		// CASE
		// 	WHEN (tickets.price * (1 - dc.amount / 100)) < 0.01
		// 	THEN 0.01
		// 	ELSE (tickets.price * (1 - dc.amount / 100))
		// END

		// Whether we count visit only for first visited swimming pool in day (multipleEntries === false)
		// Or we count visit for every swimming pool
		const visitsForFirstSwimmingPoolsFilter =
			query.multipleEntries === false ? 'AND "checkInOrder" = 1 ' : "";

		// Ticket types in this endpoint are different
		// they are not defined by ID, but by their PRICE and ID (because of ticket types with discounts)
		const result = await sequelize.query<{
			price: string;
			swimmingPoolId: string;
			ticketTypeName: string;
			ticketTypeId: string;
			isChildren: boolean;
			numberOfUses: number;
			entryPrice: string;
			remainingEntries: number;
		}>(
			`

			SELECT subq.*, "ticketTypes"."remainingEntries"
			FROM
				(
					SELECT
						ROUND(subq."realPrice"::NUMERIC, 2) as "price", subq."ticketTypeId", subq."swimmingPoolId",
						subq."ticketTypeName", subq."isChildren", SUM(subq."numberOfUses"::int) as "numberOfUses",
						CASE
							WHEN subq."ticketTypeType" = '${TICKET_TYPE.SEASONAL}'
							THEN ROUND((subq."realPrice" / 100)::NUMERIC, 2)
							ELSE ROUND((subq."realPrice" / subq."ticketTypeEntriesNumber")::NUMERIC, 2)
						END AS "entryPrice"
					FROM
						(
							SELECT
								${computeRealPriceSql},
								tt.name AS "ticketTypeName", tickets."isChildren", tt.id AS "ticketTypeId", tickets.id AS "ticketId",
								tickets."numberOfUses", tt.type AS "ticketTypeType", tt."entriesNumber" AS "ticketTypeEntriesNumber",
								tickets."swimmingPoolId"
							FROM
								(
									SELECT
										tickets.id, tickets."orderId", tickets."ticketTypeId",
										tickets.price, tickets."isChildren", count(*) filter (where "visits"."ticketId" is not null) as "numberOfUses",
										visits."swimmingPoolId"
									FROM tickets
									LEFT JOIN
										(
											SELECT *
											FROM visits
											WHERE
												"numberOfCheckIn" > 0 ${visitsForFirstSwimmingPoolsFilter}
												${swimmingPoolsFilterSql}
												${dayFilterSQL}
										) AS "visits"
										ON visits."ticketId" = tickets.id
									GROUP BY
										tickets.id, visits."swimmingPoolId"
								) AS tickets
							LEFT JOIN orders ON orders.id = tickets."orderId"
							LEFT JOIN "discountCodes" dc ON dc.id = orders."discountCodeId"
							LEFT JOIN "ticketTypes" tt ON tt.id = tickets."ticketTypeId"
						) AS subq
					GROUP BY
						subq."realPrice", subq."ticketTypeId", subq."ticketTypeName", subq."ticketTypeType",
						subq."ticketTypeEntriesNumber", subq."isChildren", subq."swimmingPoolId"
				) AS subq
			LEFT JOIN
				(
					SELECT "realPrice", tickets."ticketTypeId", SUM("remainingEntries") as "remainingEntries"
					FROM
						(
							SELECT
								${computeRealPriceSql},
								tickets."ticketTypeId", tickets."remainingEntries"
								from tickets
							LEFT JOIN orders o ON o.id = tickets."orderId"
							LEFT JOIN"discountCodes" dc ON dc.id = o."discountCodeId"
						) AS "tickets"
					GROUP BY "realPrice", tickets."ticketTypeId"
				) as "ticketTypes"
				ON subq.price = "ticketTypes"."realPrice" AND subq."ticketTypeId" = "ticketTypes"."ticketTypeId"
			`,
			{
				bind: {
					...swimmingPoolsFilterVariables,
					...dayFilterVariables,
				},
				raw: true,
				type: QueryTypes.SELECT,
			}
		);

		const swimmingPools = await SwimmingPool.findAll({
			where: {
				id: query.swimmingPools,
			},
		});

		// Group data by price and ticket type name and create desired response
		const responseData = reduce(
			result,
			(arr, data) => {
				const {
					numberOfUses,
					remainingEntries,
					swimmingPoolId,
					...others
				} = data;
				const ticketType = find(arr, {
					price: data.price,
					ticketTypeName: data.ticketTypeName,
				});
				if (ticketType) {
					ticketType.numberOfUses += numberOfUses;
					const swimmingPool = find(ticketType.swimmingPools, {
						id: swimmingPoolId,
					});
					if (swimmingPool) {
						swimmingPool.numberOfUses = numberOfUses;
					}
				} else {
					// push new ticket type record and his all swimming pools
					arr.push({
						...others,
						numberOfUses,
						remainingEntries,
						swimmingPools: map(swimmingPools, (pool) => {
							if (pool.id === swimmingPoolId) {
								return {
									numberOfUses,
									id: swimmingPoolId,
									name: pool.name,
								};
							}
							return {
								numberOfUses: 0,
								id: pool.id,
								name: pool.name,
							};
						}),
					});
				}

				return arr;
			},
			[]
		);

		return res.json({
			data: map(responseData, (ticketType: TicketTypeRecord) => {
				const { price, entryPrice, ...other } = ticketType;
				const finalPrice =
					Math.round(
						Number(entryPrice) * ticketType.numberOfUses * 100
					) / 100;
				const commission =
					Math.round(
						finalPrice * appConfig.commissionCoefficient * 100
					) / 100;
				return {
					finalPrice,
					commission,
					cleanPrice:
						Math.round((finalPrice - commission) * 100) / 100,
					price: Number(price),
					entryPrice: Number(entryPrice),
					...other,
				};
			}),
		});
	} catch (err) {
		return next(err);
	}
};
