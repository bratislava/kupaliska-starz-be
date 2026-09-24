import { DataTypes, QueryInterface } from 'sequelize'
import DB from '../models'

export async function up(queryInterface: QueryInterface) {
	const transaction = await DB.transaction()

	try {
		const exists = await queryInterface.tableExists('users', {
			transaction,
		})

		if (!exists) {
			await transaction.rollback()
			return
		}

		await queryInterface.sequelize.query(
			`SELECT pg_advisory_xact_lock(hashtext('migration-users'))`,
			{
				transaction,
			}
		)

		const table = await queryInterface.describeTable('users')

		if (!('passwordPepperId' in table)) {
			await queryInterface.addColumn(
				'users',
				'passwordPepperId',
				{
					type: DataTypes.INTEGER,
					allowNull: true,
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
		const exists = await queryInterface.tableExists('users', {
			transaction,
		})

		if (!exists) {
			await transaction.rollback()
			return
		}

		await queryInterface.sequelize.query(
			`SELECT pg_advisory_xact_lock(hashtext('migration-users'))`,
			{
				transaction,
			}
		)

		const table = await queryInterface.describeTable('users')

		if ('passwordPepperId' in table) {
			await queryInterface.removeColumn('users', 'passwordPepperId', {
				transaction,
			})
		}

		await transaction.commit()
	} catch (err) {
		await transaction.rollback()
		throw err
	}
}
