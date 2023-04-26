import crypto from 'crypto'

const ALGORITHM = 'SHA1'
const SIGNATURE_FORMAT = 'base64'

export const createSignature = (
	data: string,
	privateKey: Buffer,
	privateKeyPassphrase: string
): string => {
	const signer = crypto.createSign(ALGORITHM)
	signer.update(data)
	signer.end()
	return signer.sign(
		{ key: privateKey, passphrase: privateKeyPassphrase },
		SIGNATURE_FORMAT
	)
}

export const verifySignature = (
	data: string,
	signature: string,
	publicKey: Buffer
): boolean => {
	const verifier = crypto.createVerify(ALGORITHM)
	verifier.update(data)
	verifier.end()
	const result = verifier.verify(publicKey, signature, SIGNATURE_FORMAT)
	// console.log(`Signature verified: ${result}`)
	return result
}
