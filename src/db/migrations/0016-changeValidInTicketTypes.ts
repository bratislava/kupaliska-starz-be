import { QueryInterface, DataTypes, Op } from 'sequelize'
import { checkTableExists } from '../../utils/helpers'
export async function up(queryInterface: QueryInterface) {
	try {
		const exists = await checkTableExists(queryInterface, 'ticketTypes')

		if (!exists) {
			return Promise.resolve()
		}

		await queryInterface.bulkUpdate(
			'ticketTypes',
			{
				validFrom: '2021-01-01',
			},
			{
				validFrom: {
					[Op.is]: null,
				},
			}
		)

		await queryInterface.bulkUpdate(
			'ticketTypes',
			{
				validTo: '2021-12-12',
			},
			{
				validTo: {
					[Op.is]: null,
				},
			}
		)

		await queryInterface.changeColumn('ticketTypes', 'validFrom', {
			type: DataTypes.DATEONLY,
			allowNull: false,
		})

		await queryInterface.changeColumn('ticketTypes', 'validTo', {
			type: DataTypes.DATEONLY,
			allowNull: false,
		})

		return Promise.resolve()
	} catch (err) {
		throw err
	}
}

export async function down(queryInterface: QueryInterface) {
	await queryInterface.changeColumn('ticketTypes', 'validFrom', {
		type: DataTypes.DATEONLY,
		allowNull: true,
	})

	await queryInterface.changeColumn('ticketTypes', 'validTo', {
		type: DataTypes.DATEONLY,
		allowNull: true,
	})

	return Promise.resolve()
}
