import { v4 as uuidv4 } from 'uuid'

export const createSwimmingPool = (swimmingPoolId = uuidv4()) => ({
	id: swimmingPoolId,
	name: 'Delfin',
	description: 'Popis kupaliska delfín.',
	expandedDescription: 'Dlhsí Popis kupaliska delfín.',
	waterTemp: -5,
	maxCapacity: 1000,
	openingHours: [{ startFrom: '2021-01-01', startTo: '2022-01-01' }],
	facilities: ['food', 'playground'],
	locationUrl: 'https://goo.gl/maps/gvuMM4mYWvtGiRfN8',
})
