import { customAlphabet } from 'nanoid'
export const generateDiscountCode = (existingCodes: string[]): string => {

	let code
	do {
		code = generateRandomCode()
	} while (existingCodes.includes(code))

	return code
}

const generateRandomCode = () => {
	const coupon = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 8)()
	return coupon.toUpperCase()
}


