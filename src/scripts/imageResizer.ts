import jimp from 'jimp'
import fs from 'fs'
import { getResizedImagePath } from '../utils/imageResizer'

const thumbnailHeight = 100
const smallHeight = 320
const mediumHeight = 720
const largeHeight = 1080

async function readAndResizeImage(
	filePath: string,
	mimeType: string,
	quality: number,
	height: number,
	suffix: string
) {
	const fileBuffer = await jimp.read(filePath)
	const imageBuffer = await fileBuffer
		.quality(quality)
		.resize(
			jimp.AUTO,
			fileBuffer.bitmap.height > height
				? height
				: fileBuffer.bitmap.height
		)
		.background(0xffffffff)
		.getBufferAsync(mimeType)
	const newFilePath = getResizedImagePath(filePath, suffix)
	return fs.writeFileSync(newFilePath, imageBuffer)
}

process.on(
	'message',
	async (message: { filePath: string; mimeType: string }) => {
		try {
			await Promise.all([
				readAndResizeImage(
					message.filePath,
					message.mimeType,
					70,
					thumbnailHeight,
					'thumb'
				),
				readAndResizeImage(
					message.filePath,
					message.mimeType,
					80,
					smallHeight,
					'small'
				),
				readAndResizeImage(
					message.filePath,
					message.mimeType,
					80,
					mediumHeight,
					'medium'
				),
				readAndResizeImage(
					message.filePath,
					message.mimeType,
					90,
					largeHeight,
					'large'
				),
			])
			return process.send({ type: 'success' })
		} catch (err) {
			return process.send({ type: 'error', err })
		}
	}
)
