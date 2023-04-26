import { sequelize } from '../src/db/models'
import { seedsUp } from '../src/db/seeders/test'
import clearDB from './clearDB'

jest.mock('../src/middlewares/recaptchaMiddleware')
jest.mock('../src/services/mailerService')
// jest.mock('../src/services/webpayService');

beforeAll(async () => {
	// Sequence running of seeds (some seeds depend on others)
	await seedsUp.reduce(
		(promise, seed): Promise<any> =>
			promise.then(() => seed(sequelize.getQueryInterface())),
		Promise.resolve()
	)
})

afterAll(async () => {
	await clearDB()
	jest.clearAllMocks()
	jest.resetModules()
	await sequelize.close()
	global.gc()
})

jest.setTimeout(30000)
