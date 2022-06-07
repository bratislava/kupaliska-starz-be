import uploadFileFromBase64 from './uploader'
import { Request } from 'express'
import { models } from '../db/models'

export const uploadImage = async (
	req: Request,
	image: string,
	relatedId: string,
	relatedType: string,
	directory: string,
	transaction: any,
	id?: string
) => {
	const { File } = models

	const file = await uploadFileFromBase64(req, image, directory)
	return await File.upsert(
		{
			id: id ? id : undefined,
			name: file.fileName,
			originalPath: file.filePath,
			mimeType: file.mimeType,
			size: file.size,
			relatedId: relatedId,
			relatedType: relatedType,
		},
		{ transaction }
	)
}
