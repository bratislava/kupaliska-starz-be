import faker from 'faker';
import { v4 as uuidv4 } from 'uuid';

export const createDiscountCode = (discountCodeId = uuidv4(), code = faker.random.alphaNumeric(8)) => ({
	id: discountCodeId,
	code: code.toUpperCase(),
	amount: 20,
	validFrom: "2021-04-12",
	validTo: "2021-07-12",
})
