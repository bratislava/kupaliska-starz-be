import {Client} from 'minio'

export const minioClient = new Client({
	endPoint: 'cdn-api.bratislava.sk',
  // TODO these are mine (@mpinter), freshly generated credentials - ok to use, but should ultimately be removed from code & disabled in admin console
  // this should be replaced by MINIO_ACCESS_KEY and MINIO_SECRET_KEY, which both exist as secrets in all of our kbs envs
	accessKey: 'kyUXBuyU4fV2zEoQ',
	secretKey: 'k8LRst9Mz5nbJIZwlcVLonRD6WgJYcQZ'
})

export const uploadFileToBucket = (fullPath: string) => new Promise((resolve, reject) => {
  minioClient.fPutObject('kupaliska-starz', fullPath, fullPath, function(e) {
    if (e) {
      console.log(e)
      reject(e)
    }
    resolve(fullPath)
  })
})

export const downloadFileFromBucket = (fullPath: string) => new Promise((resolve, reject) => {
  minioClient.fGetObject('kupaliska-starz', fullPath, fullPath, function(e) {
    if (e) {
      console.log(e)
      reject(e)
    }
    resolve(fullPath)
  })
})