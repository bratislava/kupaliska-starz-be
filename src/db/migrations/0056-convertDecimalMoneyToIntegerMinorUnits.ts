import { QueryInterface, Transaction } from 'sequelize'
import DB from '../../db/models'

/**
 * Converts DECIMAL(10,2) money columns
 * to INTEGER storing minor units (e.g. euros → cents): new_value = round(old * 100).
 *
 * We handle hundreds of euros at most, so INTEGER is enough in any our use case
 * Application code and raw SQL must treat these columns as minor units after this migration.
 */

const toIntegerCurrency = async (
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

const toDecimalCurrency = async (
	queryInterface: QueryInterface,
	table: string,
	column: string,
	transaction: Transaction
) => {
	await queryInterface.sequelize.query(
		`ALTER TABLE "${table}" ALTER COLUMN "${column}" TYPE DECIMAL(10, 2) USING ("${column}"::numeric / 100);`,
		{ transaction }
	)
}

export async function up(queryInterface: QueryInterface) {
	const transaction = await DB.transaction()
	try {
		const tablePaymentOrdersExists = await queryInterface.tableExists('paymentOrders', {
			transaction,
		})

		const tableOrdersExists = await queryInterface.tableExists('orders', {
			transaction,
		})

		const tableTicketsExists = await queryInterface.tableExists('tickets', {
			transaction,
		})

		const tableTicketTypesExists = await queryInterface.tableExists('ticketTypes', {
			transaction,
		})

		if (
			!tablePaymentOrdersExists ||
			!tableOrdersExists ||
			!tableTicketsExists ||
			!tableTicketTypesExists
		) {
			await transaction.rollback()
			return
		}

		const tablePaymentOrders = await queryInterface.describeTable('paymentOrders')
		if (tablePaymentOrders.paymentAmount) {
			await toIntegerCurrency(queryInterface, 'paymentOrders', 'paymentAmount', transaction)
		}

		const tableOrders = await queryInterface.describeTable('orders')
		if (tableOrders.priceWithVat) {
			await toIntegerCurrency(queryInterface, 'orders', 'priceWithVat', transaction)
		}
		if (tableOrders.discount) {
			await toIntegerCurrency(queryInterface, 'orders', 'discount', transaction)
		}

		const tableTickets = await queryInterface.describeTable('tickets')
		if (tableTickets.priceWithVat) {
			await toIntegerCurrency(queryInterface, 'tickets', 'priceWithVat', transaction)
		}

		const tableTicketTypes = await queryInterface.describeTable('ticketTypes')
		if (tableTicketTypes.priceWithVat) {
			await toIntegerCurrency(queryInterface, 'ticketTypes', 'priceWithVat', transaction)
		}
		if (tableTicketTypes.childrenPriceWithVat) {
			await toIntegerCurrency(queryInterface, 'ticketTypes', 'childrenPriceWithVat', transaction)
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
		const tablePaymentOrdersExists = await queryInterface.tableExists('paymentOrders', {
			transaction,
		})

		const tableOrdersExists = await queryInterface.tableExists('orders', {
			transaction,
		})

		const tableTicketsExists = await queryInterface.tableExists('tickets', {
			transaction,
		})

		const tableTicketTypesExists = await queryInterface.tableExists('ticketTypes', {
			transaction,
		})

		if (
			!tablePaymentOrdersExists ||
			!tableOrdersExists ||
			!tableTicketsExists ||
			!tableTicketTypesExists
		) {
			await transaction.rollback()
			return
		}
		const tablePaymentOrders = await queryInterface.describeTable('paymentOrders')
		if (tablePaymentOrders.paymentAmount) {
			await toDecimalCurrency(queryInterface, 'paymentOrders', 'paymentAmount', transaction)
		}

		const tableOrders = await queryInterface.describeTable('orders')
		if (tableOrders.priceWithVat) {
			await toDecimalCurrency(queryInterface, 'orders', 'priceWithVat', transaction)
		}
		if (tableOrders.discount) {
			await toDecimalCurrency(queryInterface, 'orders', 'discount', transaction)
		}

		const tableTickets = await queryInterface.describeTable('tickets')
		if (tableTickets.priceWithVat) {
			await toDecimalCurrency(queryInterface, 'tickets', 'priceWithVat', transaction)
		}

		const tableTicketTypes = await queryInterface.describeTable('ticketTypes')
		if (tableTicketTypes.priceWithVat) {
			await toDecimalCurrency(queryInterface, 'ticketTypes', 'priceWithVat', transaction)
		}
		if (tableTicketTypes.childrenPriceWithVat) {
			await toDecimalCurrency(queryInterface, 'ticketTypes', 'childrenPriceWithVat', transaction)
		}

		await transaction.commit()
	} catch (err) {
		await transaction.rollback()
		throw err
	}
}
