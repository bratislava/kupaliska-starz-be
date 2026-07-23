import { Request, Response } from 'express'
import { Client } from 'minio'
import { Stream } from 'node:stream'
import { logger } from './logger'
import { IMinioConfig } from '../types/interfaces'

import config from 'config'

const minioConfig: IMinioConfig = config.get('minio')

export const minioClient = new Client({
	endPoint: minioConfig.endPoint,
	port: Number(minioConfig.port),
	useSSL: true,
	accessKey: minioConfig.accessKey,
	secretKey: minioConfig.secretKey,
	pathStyle: false,
})

export const uploadFileToBucket = async (fullPath: string, buffer: Buffer) => {
	try {
		return await minioClient.putObject(minioConfig.bucket, fullPath, buffer)
	} catch (error) {
		if (error instanceof Error) {
			logger.error(error.message)
		} else {
			logger.error(`uploadFileToBucket is throwing non Error: ${String(error)}`)
		}
		throw error
	}
}

export const downloadFileFromBucket = async (fullPath: string): Promise<Stream> => {
	try {
		return await minioClient.getObject(minioConfig.bucket, fullPath)
	} catch (error) {
		if (error instanceof Error) {
			logger.error(error.message)
		} else {
			logger.error(`downloadFileFromBucket is throwing non Error: ${String(error)}`)
		}

		throw error
	}
}

// serve minio directory (path) on a given url -
// i.e. app.use('/files/public', staticServeMiddleware('/hello/world')) serve content of sub-directory 'world' on url '/files/public'
// works recursively
// path assumes no trailing / !
export const minioStaticServeMiddleware = (path: string) => async (req: Request, res: Response) => {
	await new Promise((resolve, reject) =>
		minioClient.getObject(minioConfig.bucket, `${path}${req.url}`, (err, stream) => {
			if (err) {
				logger.error(err)
				return reject(err)
			}
			stream.on('data', (chunk: any) => res.write(chunk))
			stream.on('end', () => {
				res.end()
				resolve(null)
			})
		})
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
