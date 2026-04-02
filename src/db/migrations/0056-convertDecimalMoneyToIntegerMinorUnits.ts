import { QueryInterface, Transaction } from 'sequelize'
import DB from '../../db/models'
import { checkTableExists } from '../../utils/helpers'

/**
 * Converts DECIMAL(10,2) money columns (marked // TODO change to integer on models)
 * to INTEGER storing minor units (e.g. euros → cents): new_value = round(old * 100).
 *
 * INTEGER is used so values up to DECIMAL(10,2) max still fit after ×100.
 * Application code and raw SQL must treat these columns as minor units after this migration.
 */

const toMinorUnits = async (
	queryInterface: QueryInterface,
	table: string,
	column: string,
	transaction: Transaction
) => {
	await queryInterface.sequelize.query(
		`ALTER TABLE "${table}" ALTER COLUMN "${column}" TYPE INTEGER USING (ROUND("${column}"::numeric * 100));`,
		{ transaction }
	)
}

const toDecimalMoney = async (
	queryInterface: QueryInterface,
	table: string,
	column: string,
	transaction: Transaction
) => {
	await queryInterface.sequelize.query(
		// not sure if it is necessary to round to 2 decimal places? Ask Lukas
		`ALTER TABLE "${table}" ALTER COLUMN "${column}" TYPE DECIMAL(10, 2) USING (ROUND("${column}"::numeric / 100, 2));`,
		{ transaction }
	)
}

export async function up(queryInterface: QueryInterface) {
	const transaction = await DB.transaction()
	try {
		if (await checkTableExists(queryInterface, 'paymentOrders')) {
			const table = await queryInterface.describeTable('paymentOrders')
			if (table.paymentAmount) {
				await toMinorUnits(
					queryInterface,
					'paymentOrders',
					'paymentAmount',
					transaction
				)
			}
		}

		if (await checkTableExists(queryInterface, 'orders')) {
			const table = await queryInterface.describeTable('orders')
			if (table.priceWithVat) {
				await toMinorUnits(
					queryInterface,
					'orders',
					'priceWithVat',
					transaction
				)
			}
			if (table.discount) {
				await toMinorUnits(
					queryInterface,
					'orders',
					'discount',
					transaction
				)
			}
		}

		if (await checkTableExists(queryInterface, 'tickets')) {
			const table = await queryInterface.describeTable('tickets')
			if (table.priceWithVat) {
				await toMinorUnits(
					queryInterface,
					'tickets',
					'priceWithVat',
					transaction
				)
			}
		}

		if (await checkTableExists(queryInterface, 'ticketTypes')) {
			const table = await queryInterface.describeTable('ticketTypes')
			if (table.priceWithVat) {
				await toMinorUnits(
					queryInterface,
					'ticketTypes',
					'priceWithVat',
					transaction
				)
			}
			if (table.childrenPriceWithVat) {
				await toMinorUnits(
					queryInterface,
					'ticketTypes',
					'childrenPriceWithVat',
					transaction
				)
			}
		}

		await transaction.commit()
	} catch (err) {
		await transaction.rollback()
		throw err
	}
}

export async function down(queryInterface: QueryInterface) {
	const transaction = await DB.transaction()
	try {
		if (await checkTableExists(queryInterface, 'paymentOrders')) {
			const table = await queryInterface.describeTable('paymentOrders')
			if (table.paymentAmount) {
				await toDecimalMoney(
					queryInterface,
					'paymentOrders',
					'paymentAmount',
					transaction
				)
			}
		}

		if (await checkTableExists(queryInterface, 'orders')) {
			const table = await queryInterface.describeTable('orders')
			if (table.priceWithVat) {
				await toDecimalMoney(
					queryInterface,
					'orders',
					'priceWithVat',
					transaction
				)
			}
			if (table.discount) {
				await toDecimalMoney(
					queryInterface,
					'orders',
					'discount',
					transaction
				)
			}
		}

		if (await checkTableExists(queryInterface, 'tickets')) {
			const table = await queryInterface.describeTable('tickets')
			if (table.priceWithVat) {
				await toDecimalMoney(
					queryInterface,
					'tickets',
					'priceWithVat',
					transaction
				)
			}
		}

		if (await checkTableExists(queryInterface, 'ticketTypes')) {
			const table = await queryInterface.describeTable('ticketTypes')
			if (table.priceWithVat) {
				await toDecimalMoney(
					queryInterface,
					'ticketTypes',
					'priceWithVat',
					transaction
				)
			}
			if (table.childrenPriceWithVat) {
				await toDecimalMoney(
					queryInterface,
					'ticketTypes',
					'childrenPriceWithVat',
					transaction
				)
			}
		}

		await transaction.commit()
	} catch (err) {
		await transaction.rollback()
		throw err
	}
}
