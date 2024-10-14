import { sequelize } from '../src/db/models'
import { seedsUp } from '../src/db/seeders/test'
import clearDB from './clearDB'

jest.mock('../src/middlewares/recaptchaMiddleware')
jest.mock('../src/services/mailerService')
jest.mock('minio', () => {
	const actualMinio = jest.requireActual('minio')
	return {
		...actualMinio,
		Client: class extends actualMinio.Client {
			constructor(...args: any[]) {
				super(...args)
				this.fPutObject = jest
					.fn()
					.mockImplementation(
						(
							_bucket,
							_objectName,
							_filePath,
							_metaData,
							callback
						) => {
							// Simulate successful upload and call the callback
							callback(null)
						}
					)
			}
		},
	}
})
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
	if (global.gc) {
		global.gc()
	}
})

jest.setTimeout(30000)
