import 'dotenv/config'
import path from 'path'
import fs from 'fs'
import { forEach, isArray } from 'lodash'

const filesPath = path.join(process.cwd(), 'test-files')
const logsPath = path.join(process.cwd(), 'logs')
const keysPath = process.env.GP_WEBPAY_KEYS_PATH
const privateKeyPath = path.join(
	process.env.GP_WEBPAY_KEYS_PATH,
	'merchant-pvk.key'
)
const gpPublicKeyPath = path.join(
	process.env.GP_WEBPAY_KEYS_PATH,
	'gpe.signing.pem'
)

// eslint-disable-next-line no-unused-expressions
fs.existsSync(keysPath) || fs.mkdirSync(keysPath, { recursive: true })
// eslint-disable-next-line no-unused-expressions
fs.existsSync(privateKeyPath) ||
	fs.writeFileSync(privateKeyPath, 'private-key-test')
// eslint-disable-next-line no-unused-expressions
fs.existsSync(gpPublicKeyPath) ||
	fs.writeFileSync(gpPublicKeyPath, 'public-key-test')

// eslint-disable-next-line no-unused-expressions
fs.existsSync(filesPath) || fs.mkdirSync(filesPath)
// eslint-disable-next-line no-unused-expressions
fs.existsSync(logsPath) || fs.mkdirSync(logsPath)

forEach(
	[
		['private', 'profile-photos'],
		['private', 'swimming-logged-user'],
		['private', 'associated-swimmer'],
		['public', 'swimming-pools'],
	],
	(subdir) => {
		let absolutePath
		if (isArray(subdir)) {
			absolutePath = path.join(filesPath, ...subdir)
		} else {
			absolutePath = path.join(logsPath, subdir)
		}

		// eslint-disable-next-line no-unused-expressions
		fs.existsSync(absolutePath) ||
			fs.mkdirSync(absolutePath, { recursive: true })
	}
)

export = {
	app: {
		filesPath,
		logsPath,
	},
}
