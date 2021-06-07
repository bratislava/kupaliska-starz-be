import { Op, QueryInterface } from 'sequelize'
import { USER_ROLE } from '../../../utils/enums'
import { hashPassword } from '../../../utils/authorization'
import { v4 as uuidv4 } from 'uuid';

const id = uuidv4()

export async function up(queryInterface: QueryInterface) {
	return queryInterface.bulkInsert('users', [
		{
			id: id,
			name: 'Marián Bohunsky',
			email: 'bohunsky@starz.sk',
			role: USER_ROLE.SUPER_ADMIN,
			isConfirmed: true,
			hash: hashPassword('Password123')
		},
	])
}

export async function down(queryInterface: QueryInterface) {
	return queryInterface.bulkDelete('users',
		{ id: { [Op.eq]: id } }
	)
}
