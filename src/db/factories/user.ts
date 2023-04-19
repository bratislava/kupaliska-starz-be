import faker from 'faker'
import { USER_ROLE } from '../../utils/enums'
import { v4 as uuidv4 } from 'uuid'

export const createUser = (
	userId = uuidv4(),
	userRole = USER_ROLE.OPERATOR
) => ({
	id: userId,
	name: 'Placeholder User',
	email: faker.internet.email(),
	role: userRole,
	isConfirmed: true,
	hash: 'hashedPassword',
	issuedTokens: 0,
	tokenValidFromNumber: 0,
})
