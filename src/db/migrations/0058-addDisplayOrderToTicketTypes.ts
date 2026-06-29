import { QueryInterface, DataTypes } from 'sequelize'
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

		await queryInterface.addColumn(
			'ticketTypes',
			'displayOrder',
			{
				type: DataTypes.SMALLINT,
				allowNull: false,
				defaultValue: 0,
			},
			{ transaction }
		)

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

		await queryInterface.removeColumn('ticketTypes', 'displayOrder', {
			transaction,
		})

		await transaction.commit()
	} catch (err) {
		await transaction.rollback()
		throw err
	}
}
