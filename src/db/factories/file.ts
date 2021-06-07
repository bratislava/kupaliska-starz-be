import { v4 as uuidv4 } from 'uuid';

export const createFile = (relatedId: string, relatedType = 'swimmingPool', fileId = uuidv4()) => ({
	id: fileId,
	name: 'filename-test.png',
	originalPath: 'public/swimming-pools/filename-test.png',
	mimeType: 'image/png',
	altText: 'alternativy popis',
	size: '1024',
	relatedId: relatedId,
	relatedType: relatedType
})
