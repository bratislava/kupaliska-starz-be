import { Request, Response } from 'express'
import { Client } from 'minio'
import { logger } from './logger'

export const minioClient = new Client({
	endPoint: 'cdn-api.bratislava.sk',
	port: 443,
	useSSL: true,
	// TODO these are mine (@mpinter), freshly generated credentials - ok to use, but should ultimately be removed from code & disabled in admin console
	// this should be replaced by MINIO_ACCESS_KEY and MINIO_SECRET_KEY, which both exist as secrets in all of our kbs envs
	accessKey: 'kyUXBuyU4fV2zEoQ',
	secretKey: 'k8LRst9Mz5nbJIZwlcVLonRD6WgJYcQZ',
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
