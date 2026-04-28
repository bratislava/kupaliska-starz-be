import { QueryInterface, Transaction } from 'sequelize'
import DB from '../../db/models'

/**
 * Converts DECIMAL(10,2) money columns
 * to INTEGER storing minor units (e.g. euros → cents): new_value = round(old * 100).
 *
 * We handle hundreds of euros at most, so INTEGER is enough in any our use case
 * Application code and raw SQL must treat these columns as minor units after this migration.
 */

const toMinorUnits = async (
	queryInterface: QueryInterface,
	table: string,
	column: string,
	transaction: Transaction
) => {
	await queryInterface.sequelize.query(
		`ALTER TABLE "${table}" ALTER COLUMN "${column}" TYPE INTEGER USING (("${column}"::numeric * 100)::integer);`,
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
		`ALTER TABLE "${table}" ALTER COLUMN "${column}" TYPE DECIMAL(10, 2) USING ("${column}"::numeric / 100, 2);`,
		{ transaction }
	)
}

export async function up(queryInterface: QueryInterface) {
	const transaction = await DB.transaction()
	try {
		const tablePaymentOrdersExists = await queryInterface.tableExists(
			'paymentOrders',
			{
				transaction,
			}
		)

		const tableOrdersExists = await queryInterface.tableExists('orders', {
			transaction,
		})

		const tableTicketsExists = await queryInterface.tableExists('tickets', {
			transaction,
		})

		const tableTicketTypesExists = await queryInterface.tableExists(
			'ticketTypes',
			{
				transaction,
			}
		)

		if (
			!tablePaymentOrdersExists ||
			!tableOrdersExists ||
			!tableTicketsExists ||
			!tableTicketTypesExists
		) {
			await transaction.rollback()
			return
		}

		const tablePaymentOrders = await queryInterface.describeTable(
			'paymentOrders'
		)
		if (tablePaymentOrders.paymentAmount) {
			await toMinorUnits(
				queryInterface,
				'paymentOrders',
				'paymentAmount',
				transaction
			)
		}

		const tableOrders = await queryInterface.describeTable('orders')
		if (tableOrders.priceWithVat) {
			await toMinorUnits(
				queryInterface,
				'orders',
				'priceWithVat',
				transaction
			)
		}
		if (tableOrders.discount) {
			await toMinorUnits(
				queryInterface,
				'orders',
				'discount',
				transaction
			)
		}

		const tableTickets = await queryInterface.describeTable('tickets')
		if (tableTickets.priceWithVat) {
			await toMinorUnits(
				queryInterface,
				'tickets',
				'priceWithVat',
				transaction
			)
		}

		const tableTicketTypes = await queryInterface.describeTable(
			'ticketTypes'
		)
		if (tableTicketTypes.priceWithVat) {
			await toMinorUnits(
				queryInterface,
				'ticketTypes',
				'priceWithVat',
				transaction
			)
		}
		if (tableTicketTypes.childrenPriceWithVat) {
			await toMinorUnits(
				queryInterface,
				'ticketTypes',
				'childrenPriceWithVat',
				transaction
			)
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
		const tablePaymentOrdersExists = await queryInterface.tableExists(
			'paymentOrders',
			{
				transaction,
			}
		)

		const tableOrdersExists = await queryInterface.tableExists('orders', {
			transaction,
		})

		const tableTicketsExists = await queryInterface.tableExists('tickets', {
			transaction,
		})

		const tableTicketTypesExists = await queryInterface.tableExists(
			'ticketTypes',
			{
				transaction,
			}
		)

		if (
			!tablePaymentOrdersExists ||
			!tableOrdersExists ||
			!tableTicketsExists ||
			!tableTicketTypesExists
		) {
			await transaction.rollback()
			return
		}
		const tablePaymentOrders = await queryInterface.describeTable(
			'paymentOrders'
		)
		if (tablePaymentOrders.paymentAmount) {
			await toDecimalMoney(
				queryInterface,
				'paymentOrders',
				'paymentAmount',
				transaction
			)
		}

		const tableOrders = await queryInterface.describeTable('orders')
		if (tableOrders.priceWithVat) {
			await toDecimalMoney(
				queryInterface,
				'orders',
				'priceWithVat',
				transaction
			)
		}
		if (tableOrders.discount) {
			await toDecimalMoney(
				queryInterface,
				'orders',
				'discount',
				transaction
			)
		}

		const tableTickets = await queryInterface.describeTable('tickets')
		if (tableTickets.priceWithVat) {
			await toDecimalMoney(
				queryInterface,
				'tickets',
				'priceWithVat',
				transaction
			)
		}

		const tableTicketTypes = await queryInterface.describeTable(
			'ticketTypes'
		)
		if (tableTicketTypes.priceWithVat) {
			await toDecimalMoney(
				queryInterface,
				'ticketTypes',
				'priceWithVat',
				transaction
			)
		}
		if (tableTicketTypes.childrenPriceWithVat) {
			await toDecimalMoney(
				queryInterface,
				'ticketTypes',
				'childrenPriceWithVat',
				transaction
			)
		}

		await transaction.commit()
	} catch (err) {
		await transaction.rollback()
		throw err
	}
}
