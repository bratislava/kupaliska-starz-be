import { USER_ROLE } from './../../../src/utils/enums';
import each from 'jest-each';
import { UserModel } from '../../../src/db/models/user';

describe('User model', () => {

	each([
		[USER_ROLE.SUPER_ADMIN, USER_ROLE.OPERATOR, true],
		[USER_ROLE.SUPER_ADMIN, USER_ROLE.SWIMMING_POOL_OPERATOR, true],
		[USER_ROLE.SUPER_ADMIN, USER_ROLE.SWIMMING_POOL_EMPLOYEE, true],
		[USER_ROLE.SUPER_ADMIN, USER_ROLE.SUPER_ADMIN, false],
		[USER_ROLE.OPERATOR, USER_ROLE.SUPER_ADMIN, false],
		[USER_ROLE.OPERATOR, USER_ROLE.OPERATOR, false],
		[USER_ROLE.OPERATOR, USER_ROLE.SWIMMING_POOL_OPERATOR, true],
		[USER_ROLE.OPERATOR, USER_ROLE.SWIMMING_POOL_EMPLOYEE, true],
		[USER_ROLE.SWIMMING_POOL_EMPLOYEE, USER_ROLE.SWIMMING_POOL_EMPLOYEE, false],
		[USER_ROLE.SWIMMING_POOL_OPERATOR, USER_ROLE.SWIMMING_POOL_OPERATOR, false],

	]).it("User can perform action ( input is '%s' '%s' '%s' )", async (userRole, targetRole, expected) => {
		let user = new UserModel()
		user.role = userRole
		expect(user.canPerformAction(targetRole)).toBe(expected)
    });

});
