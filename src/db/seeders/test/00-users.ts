import { QueryInterface } from 'sequelize'
import { USER_ROLE } from '../../../utils/enums'
import { hashPassword } from '../../../utils/authorization'

export const superAdmin = '13a67b3b-4385-449a-a9bb-eb16e51a97d1'
export const operator = '13a67b3b-4385-449a-a9bb-eb16e51a97d2'
export const basic = '13a67b3b-4385-449a-a9bb-eb16e51a97d3'
export const swimmingPoolOperator = '13a67b3b-4385-449a-a9bb-eb16e51a97d4'
export const swimmingPoolEmployee = '13a67b3b-4385-449a-a9bb-eb16e51a97d5'

export async function up(queryInterface: QueryInterface) {
	await queryInterface.bulkInsert('users', [
		{
			id: superAdmin,
			name: 'Super admin',
			email: 'superadmin@amcef.com',
			role: USER_ROLE.SUPER_ADMIN,
			isConfirmed: true,
			hash: 'hashedPassword',
			issuedTokens: 1,
			tokenValidFromNumber: 0
		},
		{
			id: operator,
			name: 'Admin Amcef',
			email: 'admin@amcef.com',
			role: USER_ROLE.OPERATOR,
			isConfirmed: true,
			hash: hashPassword('amcefPass132', 10),
			issuedTokens: 1,
			tokenValidFromNumber: 0
		},

		{
			id: basic,
			name: 'Basic User',
			email: 'basic@basic.com',
			role: USER_ROLE.BASIC,
			isConfirmed: true,
			hash: hashPassword('amcefPass132', 10),
			issuedTokens: 1,
			tokenValidFromNumber: 0
		},
		{
			id: swimmingPoolOperator,
			name: 'Swimming Pool Operator',
			email: 'pool_operator@example.com',
			role: USER_ROLE.SWIMMING_POOL_OPERATOR,
			isConfirmed: true,
			hash: 'hashedPassword',
			issuedTokens: 1,
			tokenValidFromNumber: 0
		},
		{
			id: swimmingPoolEmployee,
			name: 'Swimming Pool Employee',
			email: 'pool_employee@example.com',
			role: USER_ROLE.SWIMMING_POOL_EMPLOYEE,
			isConfirmed: true,
			hash: 'hashedPassword',
			issuedTokens: 1,
			tokenValidFromNumber: 0
		},
	])

}

export async function down(queryInterface: QueryInterface) {
	await queryInterface.bulkDelete('users', undefined)
}
