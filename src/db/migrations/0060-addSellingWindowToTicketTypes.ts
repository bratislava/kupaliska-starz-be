import { DataTypes, QueryInterface } from 'sequelize'
import DB from '../models'

export async function up(queryInterface: QueryInterface) {
	const transaction = await DB.transaction()

	try {
		const exists = await queryInterface.tableExists('ticketTypes', {
			transaction,
		})

		if (!exists) {
			await transaction.rollback()
			return
		}

		await queryInterface.sequelize.query(
			`SELECT pg_advisory_xact_lock(hashtext('migration-ticket-type'))`,
			{
				transaction,
			}
		)

		const table = await queryInterface.describeTable('ticketTypes')

		// column sellFrom
		if (!('sellFrom' in table)) {
			await queryInterface.addColumn(
				'ticketTypes',
				'sellFrom',
				{
					type: DataTypes.DATEONLY,
					allowNull: true,
				},
				{ transaction }
			)
			await queryInterface.sequelize.query(
				`UPDATE "ticketTypes" SET "sellFrom" = "validFrom" WHERE "sellFrom" IS NULL`,
				{ transaction }
			)
			await queryInterface.changeColumn(
				'ticketTypes',
				'sellFrom',
				{
					type: DataTypes.DATEONLY,
					allowNull: false,
				},
				{ transaction }
			)
		}

		// column sellTo
		if (!('sellTo' in table)) {
			await queryInterface.addColumn(
				'ticketTypes',
				'sellTo',
				{
					type: DataTypes.DATEONLY,
					allowNull: true,
				},
				{ transaction }
			)
			await queryInterface.sequelize.query(
				`UPDATE "ticketTypes" SET "sellTo" = "validTo" WHERE "sellTo" IS NULL`,
				{ transaction }
			)
			await queryInterface.changeColumn(
				'ticketTypes',
				'sellTo',
				{
					type: DataTypes.DATEONLY,
					allowNull: false,
				},
				{ transaction }
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
		const exists = await queryInterface.tableExists('ticketTypes', {
			transaction,
		})

		if (!exists) {
			await transaction.rollback()
			return
		}

		await queryInterface.sequelize.query(
			`SELECT pg_advisory_xact_lock(hashtext('migration-ticket-type'))`,
			{
				transaction,
			}
		)

		const table = await queryInterface.describeTable('ticketTypes')

		if ('sellFrom' in table) {
			await queryInterface.removeColumn('ticketTypes', 'sellFrom', {
				transaction,
			})
		}

		if ('sellTo' in table) {
			await queryInterface.removeColumn('ticketTypes', 'sellTo', {
				transaction,
			})
		}

		await transaction.commit()
	} catch (err) {
		await transaction.rollback()
		throw err
	}
}
