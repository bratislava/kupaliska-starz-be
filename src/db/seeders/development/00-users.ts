import { QueryInterface } from 'sequelize'
import { USER_ROLE } from '../../../utils/enums'
import { hashPassword } from '../../../utils/authorization'
import { v4 as uuidv4 } from 'uuid';

export async function up(queryInterface: QueryInterface) {
	return queryInterface.bulkInsert('users', [
		{
			id: uuidv4(),
			name: 'Admin Amcef',
			email: 'admin@amcef.com',
			role: USER_ROLE.OPERATOR,
			isConfirmed: true,
			hash: hashPassword('amcefPass132')
		},
		{
			id: uuidv4(),
			name: 'Admin Starz',
			email: 'admin@starz.com',
			role: USER_ROLE.OPERATOR,
			isConfirmed: true,
			hash: hashPassword('amcefPass132')
		},
		{
			id: uuidv4(),
			name: 'Pool Operator',
			email: 'pool@operator.com',
			role: USER_ROLE.SWIMMING_POOL_OPERATOR,
			isConfirmed: true,
			hash: hashPassword('amcefPass132')
		},
		{
			id: uuidv4(),
			name: 'Pool Employee',
			email: 'pool@employee.com',
			role: USER_ROLE.SWIMMING_POOL_EMPLOYEE,
			isConfirmed: true,
			hash: hashPassword('amcefPass132')
		},
		{
			id: uuidv4(),
			name: 'Basic User',
			email: 'basic@basic.com',
			role: USER_ROLE.BASIC,
			isConfirmed: true,
			hash: hashPassword('amcefPass132')
		},
	])
}

export async function down(queryInterface: QueryInterface) {
	return queryInterface.bulkDelete('users', undefined)
}
