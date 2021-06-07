import config from 'config'
import path from 'path'
import { CronJob } from 'cron'
import { fork } from 'child_process'

import { IWorkersConfig } from '../types/interfaces'

const workersConfig: IWorkersConfig = config.get('workers')

function workerCallback(workerName: string, data: any) {
	const workerProcess = fork(path.resolve(process.cwd(), 'src', 'workers', workerName))
	workerProcess.send({
		...data
	})
	workerProcess.on('message', (messageData) => {
		console.log('Cron finish', messageData)
		workerProcess.kill()
	})
}

export default async () => {
	// This is intentional
}
