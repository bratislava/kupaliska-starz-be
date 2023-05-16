import { QueryInterface, DataTypes } from 'sequelize'
import { checkTableExists } from '../../utils/helpers'
export async function up(queryInterface: QueryInterface) {
	try {
		const exists = await checkTableExists(
			queryInterface,
			'swimmingLoggedUsers'
		)

		if (!exists) {
			return Promise.resolve()
		}

		const table: any = await queryInterface.describeTable(
			'swimmingLoggedUsers'
		)

		if (table.externalId) {
			await queryInterface.renameColumn(
				'swimmingLoggedUsers',
				'externalId',
				'externalAzureId'
			)
		}

		if (!table.externalCognitoId) {
			await queryInterface.addColumn(
				'swimmingLoggedUsers',
				'externalCognitoId',
				{
					type: DataTypes.UUID,
					allowNull: true,
					unique: true,
				}
			)
		}

		return Promise.resolve()
	} catch (err) {
		throw err
	}
}

export async function down(queryInterface: QueryInterface) {
	const table: any = await queryInterface.describeTable('swimmingLoggedUsers')

	if (!table.externalId) {
		await queryInterface.renameColumn(
			'swimmingLoggedUsers',
			'externalAzureId',
			'externalId'
		)
	}

	if (table.externalCognitoId) {
		await queryInterface.removeColumn(
			'swimmingLoggedUsers',
			'externalCognitoId'
		)
	}

	return Promise.resolve()
}
