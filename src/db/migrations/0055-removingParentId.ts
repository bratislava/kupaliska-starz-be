import { DataTypes, QueryInterface } from 'sequelize'
import DB from '../models'

export async function up(queryInterface: QueryInterface) {
	const transaction = await DB.transaction()
	try {
		const exists = await queryInterface.tableExists('tickets', {
			transaction,
		})

		if (!exists) {
			await transaction.rollback()
			return
		}

		await queryInterface.removeColumn('tickets', 'parentTicketId')

		await transaction.commit()
	} catch (err) {
		await transaction.rollback()
		throw err
	}
}

export async function down(queryInterface: QueryInterface) {
	const transaction = await DB.transaction()
	try {
		const exists = await queryInterface.tableExists('tickets', {
			transaction,
		})

		if (!exists) {
			await transaction.rollback()
			return
		}

		await queryInterface.addColumn(
			'tickets',
			'parentTicketId',
			{
				type: DataTypes.UUID,
				references: {
					model: 'tickets',
					key: 'id',
				},
				allowNull: true,
			},
			{ transaction }
		)

		await transaction.commit()
	} catch (err) {
		await transaction.rollback()
		throw err
	}
}
