import { Request, Response } from 'express'
import { Client } from 'minio'
import { logger } from './logger'
import { IMinioConfig } from '../types/interfaces'

import config from 'config'

const minioConfig: IMinioConfig = config.get('minio')

export const minioClient = new Client({
	endPoint: minioConfig.endPoint,
	port: Number(minioConfig.port),
	useSSL: true,
	accessKey: process.env.MINIO_ACCESS_KEY,
	secretKey: process.env.MINIO_SECRET_KEY,
})

// uploads a file stored on filesystem
// path in bucket matches path on drive
export const uploadFileToBucket = (fullPath: string) => {
	return new Promise((resolve, reject) => {
		minioClient.fPutObject(
			process.env.MINIO_BUCKET,
			fullPath,
			fullPath,
			function (e: any) {
				if (e) {
					logger.error(e)
					reject(e)
				}
				resolve(fullPath)
			}
		)
	})
}

// uploads a file to the filesystem
// path in bucket matches path on drive
export const downloadFileFromBucket = (fullPath: string) =>
	new Promise((resolve, reject) => {
		minioClient.fGetObject(
			process.env.MINIO_BUCKET,
			fullPath,
			fullPath,
			function (e) {
				if (e) {
					logger.error(e)
					reject(e)
				}
				resolve(fullPath)
			}
		)
	})

// serve minio directory (path) on a given url -
// i.e. app.use('/files/public', staticServeMiddleware('/hello/world')) serve content of sub-directory 'world' on url '/files/public'
// works recursively
// path assumes no trailing / !
export const minioStaticServeMiddleware =
	(path: string) => async (req: Request, res: Response) => {
		await new Promise((resolve, reject) =>
			minioClient.getObject(
				process.env.MINIO_BUCKET,
				`${path}${req.url}`,
				(err, stream) => {
					if (err) {
						logger.error(err)
						return reject(err)
					}
					stream.on('data', (chunk: any) => res.write(chunk))
					stream.on('end', () => {
						res.end()
						resolve(null)
					})
				}
			)
		)
	}

// async (req, res) => {
//   await new Promise((resolve, reject) => minioClient.getObject(process.env.MINIO_BUCKET, `files/public${req.url}`, (err, stream) => {
//     if (err) {
//       logger.error(err)
//       return reject(err)
//     }
//     stream.on('data', (chunk: any) => res.write(chunk))
//     stream.on('end', () => {
//       res.end()
//       resolve(null)
//     })
//   }))
// }
