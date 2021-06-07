import { comparePassword, createJwt, hashPassword, verifyJwt } from '../../../src/utils/authorization';
import config from 'config'
import { IPassportConfig } from '../../../src/types/interfaces';
import { v4 as uuidv4 } from 'uuid';

const passwordConfig: IPassportConfig = config.get('passport')

describe('Authorization utils', () => {

	it('Should hash and compare password', async () => {
		const hash = hashPassword('secretPassword', 10)
		expect(await comparePassword('secretPassword', hash)).toBe(true)
	});

	it('Create jwt and verify', async () => {

		const id = uuidv4()
		const jwt = await createJwt({ uid: id}, {
			audience: passwordConfig.jwt.user.audience,
			expiresIn: passwordConfig.jwt.user.exp
		})

		const jwtPayload = await verifyJwt(jwt, passwordConfig.jwt.user.audience)

		expect(jwtPayload).toBeTruthy()
		expect((jwtPayload as any).uid).toBe(id)
	});

	it('Jwt should expire', async () => {

		const id = uuidv4()
		const jwt = await createJwt({ uid: id}, {
			audience: passwordConfig.jwt.user.audience,
			expiresIn: '2m'
		})
		jest.useFakeTimers('modern')
		jest.setSystemTime(new Date().getTime() + 130000);

		const jwtPayload = await verifyJwt(jwt, passwordConfig.jwt.user.audience)
		expect(jwtPayload).toBeFalsy()

		jest.useRealTimers();
	});

});
