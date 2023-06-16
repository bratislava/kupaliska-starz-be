import { Request, Response } from 'express'
import { Client } from 'minio'
import { logger } from './logger'

export const minioClient = new Client({
	endPoint: 'assets-api.bratislava.sk',
	port: 443,
	useSSL: true,
	accessKey: 'khwpmmJS4kl1290wRMdm',
	secretKey: 'KDfPkpJY0UVe254x2GhbZgJfRvs0cM3WQ9NEqldE',
})

// uploads a file stored on filesystem
// path in bucket matches path on drive
export const uploadFileToBucket = (fullPath: string) =>
	new Promise((resolve, reject) => {
		minioClient.fPutObject(
			'kupaliska-starz',
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

// uploads a file to the filesystem
// path in bucket matches path on drive
export const downloadFileFromBucket = (fullPath: string) =>
	new Promise((resolve, reject) => {
		minioClient.fGetObject(
			'kupaliska-starz',
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
				'kupaliska-starz',
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
//   await new Promise((resolve, reject) => minioClient.getObject('kupaliska-starz', `files/public${req.url}`, (err, stream) => {
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
