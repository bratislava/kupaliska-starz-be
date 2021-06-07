import 'colors'
import http from 'http'
import config from 'config'
import { forEach, isArray } from 'lodash'
import path from 'path'
import fs from 'fs'

import app from './app'
import { IAppConfig } from './types/interfaces'
// utils
const httpServer = http.createServer(app)
const appConfig: IAppConfig = config.get('app')

// Ensure file structe exists
forEach(appConfig.subdirs, (subdir) => {
	let absolutePath
	if (isArray(subdir)) {
		absolutePath = path.join(appConfig.filesPath, ...subdir)
	} else {
		absolutePath = path.join(appConfig.filesPath, subdir)
	}

	// eslint-disable-next-line no-unused-expressions
	fs.existsSync(absolutePath) || fs.mkdirSync(absolutePath, { recursive: true })
})

httpServer.listen(appConfig.port).on('listening', () => {
	console.log(`Server started in ${process.env.NODE_ENV} mode at port ${appConfig.port}`.green)
})

export default httpServer
