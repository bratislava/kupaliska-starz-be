import faker from 'faker'
import { v4 as uuidv4 } from 'uuid'

export const createProfile = (profileId = uuidv4()) => ({
	id: profileId,
	email: faker.internet.email(),
	name: faker.name.findName(),
	age: faker.random.number(99) + 3,
	zip: faker.address.zipCode(),
})
