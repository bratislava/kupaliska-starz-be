import { QueryInterface, DataTypes } from 'sequelize'
import { checkTableExists } from '../../utils/helpers'
export async function up(queryInterface: QueryInterface) {
	try {
		const exists = await checkTableExists(
			queryInterface,
			'associatedSwimmers'
		)

		if (!exists) {
			return Promise.resolve()
		}

		const table: any = await queryInterface.describeTable(
			'associatedSwimmers'
		)

		if (table.firstname) {
			await queryInterface.removeColumn('associatedSwimmers', 'firstname')
			await queryInterface.addColumn('associatedSwimmers', 'firstname', {
				type: DataTypes.STRING(255),
				allowNull: true,
			})
		}

		if (!table.firstname) {
			await queryInterface.addColumn('associatedSwimmers', 'firstname', {
				type: DataTypes.STRING(255),
				allowNull: true,
			})
		}

		return Promise.resolve()
	} catch (err) {
		throw err
	}
}

export async function down(queryInterface: QueryInterface) {
	const table: any = await queryInterface.describeTable('associatedSwimmers')

	if (!table.firstname) {
		await queryInterface.addColumn('associatedSwimmers', 'firstname', {
			type: DataTypes.UUID,
			allowNull: true,
		})
	}

	if (table.firstname) {
		await queryInterface.removeColumn('associatedSwimmers', 'firstname')
		await queryInterface.addColumn('associatedSwimmers', 'firstname', {
			type: DataTypes.UUID,
			allowNull: true,
		})
	}

	return Promise.resolve()
}
