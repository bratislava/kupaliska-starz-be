import { QueryInterface, DataTypes } from 'sequelize'
import { checkTableExists } from '../../utils/helpers'
export async function up(queryInterface: QueryInterface) {
	try {
		const exists = await checkTableExists(queryInterface, 'entries')

		if (!exists) {
			return Promise.resolve()
		}

		const table: any = await queryInterface.describeTable('entries')
		if (!table.flag) {
			await queryInterface.addColumn('entries', 'flag', {
				type: DataTypes.STRING(1),
				allowNull: false,
			})
		}

		return Promise.resolve()
	} catch (err) {
		throw err
	}
}

export async function down(queryInterface: QueryInterface) {
	const table: any = await queryInterface.describeTable('entries')
	if (table.flag) {
		await queryInterface.removeColumn('entries', 'flag')
	}

	return Promise.resolve()
}
