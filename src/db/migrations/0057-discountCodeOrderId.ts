import { DataTypes, QueryInterface } from 'sequelize'
import DB from '../models'

export async function up(queryInterface: QueryInterface) {
	const transaction = await DB.transaction()
	try {
		const exists = await queryInterface.tableExists('discountCodes', {
			transaction,
		})

		if (!exists) {
			await transaction.rollback()
			return
		}

		await queryInterface.addColumn(
			'discountCodes',
			'orderId',
			{
				type: DataTypes.UUID,
				references: {
					model: 'orders',
					key: 'id',
				},
				allowNull: true,
			},
			{ transaction }
		)

		await queryInterface.addIndex('discountCodes', ['orderId'], {
			name: 'discountCodes_orderId_idx',
			transaction,
		})

		await transaction.commit()
	} catch (err) {
		await transaction.rollback()
		throw err
	}
}

export async function down(queryInterface: QueryInterface) {
	const transaction = await DB.transaction()
	try {
		const exists = await queryInterface.tableExists('discountCodes', {
			transaction,
		})

		if (!exists) {
			await transaction.rollback()
			return
		}
		await queryInterface.removeIndex('discountCodes', 'discountCodes_orderId_idx', {
			transaction,
		})

		await queryInterface.removeColumn('discountCodes', 'orderId', {
			transaction,
		})

		await transaction.commit()
	} catch (err) {
		await transaction.rollback()
		throw err
	}
}
