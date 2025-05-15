import { Op, QueryInterface } from 'sequelize'
import { USER_ROLE } from '../../../utils/enums'
import { hashPassword } from '../../../utils/authorization'
import { v4 as uuidv4 } from 'uuid'

const id = uuidv4()

export async function up(queryInterface: QueryInterface) {
	return queryInterface.bulkInsert('users', [
		{
			id: id,
			name: 'Adam Grund',
			email: 'adam.grund@bratislava.sk',
			role: USER_ROLE.SUPER_ADMIN,
			isConfirmed: true,
			hash: hashPassword('4yKTz1cu7Fjn0TEeZ4BjSS7eu'),
		},
	])
}

export async function down(queryInterface: QueryInterface) {
	return queryInterface.bulkDelete('users', { id: { [Op.eq]: id } })
}
