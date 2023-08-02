import config from 'config'
import path from 'path'
import { CronJob } from 'cron'
import { ChildProcess, fork } from 'child_process'
import fs from 'fs'

import { IWorkersConfig } from '../types/interfaces'

const workersConfig: IWorkersConfig = config.get('workers')

function workerCallback(workerName: string, data: any) {
	const workerPath = path.join(
		process.cwd(),
		'dist',
		'src',
		'workers',
		`${workerName}.js`
	)
	const workerPathTs = path.join(
		process.cwd(),
		'src',
		'workers',
		`${workerName}.ts`
	)

	let workerProcess: ChildProcess
	if (fs.existsSync(workerPath)) {
		workerProcess = fork(workerPath)
	} else {
		workerProcess = fork(workerPathTs)
	}

	workerProcess.send({
		...data,
	})
	workerProcess.on('message', (messageData) => {
		console.log('Cron finish', messageData)
		workerProcess.kill()
	})
}

export default async () => {
	new CronJob(
		workersConfig.schedule.visitsComputation,
		() => workerCallback('visitsComputation', {}),
		null,
		true,
		'Europe/Bratislava'
	).start(),
		new CronJob(
			workersConfig.schedule.refreshCustomersView,
			() => workerCallback('refreshCustomersView', {}),
			null,
			true,
			'Europe/Bratislava'
		).start(),
		new CronJob(
			workersConfig.schedule.checkCreatedUnpaidOrders,
			() => workerCallback('checkCreatedUnpaidOrders', {}),
			null,
			true,
			'Europe/Bratislava'
		).start()
}
