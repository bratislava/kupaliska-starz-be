import { ENTRY_TYPE } from '../../../utils/enums';
import Joi from 'joi'
import { Op, Sequelize } from 'sequelize'
import { NextFunction, Request, Response } from 'express'
import { models } from '../../../db/models'
import { map, range } from 'lodash';
import joiDate from '@joi/date'
import { TicketModel } from '../../../db/models/ticket';
import i18next from 'i18next';

const JoiDateExtension = Joi.extend(joiDate(Joi))

export const schema = Joi.object().keys({
	body: Joi.object(),
	query: Joi.object().keys({
		intervalInMinutes: Joi.number().min(10).max(720).default(60),
		intervalDividedBy: Joi.string().valid('age', 'zip'),
		ageInterval: Joi.number().default(10),
		day: JoiDateExtension.date().format(['YYYY-MM-DD']).raw().required()
	}),
	params: Joi.object().keys({
		swimmingPoolId: Joi.string().guid({version: ['uuidv4']}).required()
	})
})

const {
	Ticket
} = models

export const workflow = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { query }: any = req
		const { params } = req

		const tickets = await Ticket.findAll({
			attributes: ['id'],

			include: [{
				association: 'entries',
				attributes: ['id', 'type', 'timestamp', 'ticketId'],
				required: true,
				where: {
					[Op.and]: [
						Sequelize.literal(`cast(timestamp as DATE) = '${query.day}'`),
						{
							swimmingPoolId: {
								[Op.eq]: params.swimmingPoolId
							}
						}
					]
				},
			},
			{
				association: 'profile',
				attributes: ['id', 'age', 'zip'],
			}
		],
		})

		const numberOfBuckets = Math.ceil(24 * 60 / query.intervalInMinutes)
		const buckets = map(range(0, numberOfBuckets), () => (query.intervalDividedBy ? {} as any : 0))

		if (query.intervalDividedBy === 'age') {
			initializeAgeBuckets(buckets, query.ageInterval)
		}

		for (const ticket of tickets) {
			ticket.entries.sort((a,b) => (
				a.timestamp > b.timestamp ? 1 : -1
			))

			let startEntry = ticket.entries[0]
			// iterate over ticket entries and find all visits
			for (const [index, entry] of ticket.entries.entries()) {
				if (startEntry.type === ENTRY_TYPE.CHECKIN) {

					// when entry has CHECK-IN and CHECK-OUT(or is last event) - then record visit
					if (entry.type === ENTRY_TYPE.CHECKOUT || ticket.entries.length - 1 === index ) {

						const lowerBound = getLowerBucket(startEntry.timestamp, query.intervalInMinutes)
						const upperBound = getUpperBucket(entry.timestamp, entry.type, query.intervalInMinutes)
						fillBucketsWithVisits(buckets, lowerBound, upperBound, ticket, query.intervalDividedBy, query.ageInterval)
						startEntry = entry
					}
				} else {
					startEntry = entry
				}
			}
		}

		return res.json({
			data: buckets
		})

	} catch (err) {
		return next(err)
	}
}


/**
 * Initialize array of objects with age intervals to 0
 * @param buckets Array of empty objects to be initialize (split by age intervals)
 * @param ageInterval How big is the age interval.
 *
 */
const initializeAgeBuckets = (buckets: any[], ageInterval: number) => {
	for (const interval of buckets) {
		for (let i = 0; i < (Math.ceil(120 / ageInterval)); i++) {
			interval[`${i * ageInterval}-${((i + 1) * ageInterval) - 1 }`] = 0
		}
		interval[i18next.t('none')] = 0
	}
}

/**
 * Get bucket index based on the timestamp (lower).
 * @param timestamp Timestamp of the lower CHECK-IN entry.
 * @param intervalInMinutes How big is day interval in the minutes.
 *
 */
const getLowerBucket = (timestamp: Date, intervalInMinutes: number) => {
	const startHour = new Date(timestamp).getHours()
	const startMinute = new Date(timestamp).getMinutes()
	return  Math.floor((startHour * 60 + startMinute) / intervalInMinutes)
}

/**
 * Get bucket index based on the timestamp (upper).
 * @param timestamp Timestamp of the upper entry.
 * @param entryType Entry type. If it`s CHECK-IN, then we are missing last CHECK-OUT entry - so we set upper bucket as last possible index.
 * @param intervalInMinutes How big is day interval in the minutes.
 *
 */
const getUpperBucket = (timestamp: Date, entryType: ENTRY_TYPE, intervalInMinutes: number) => {
	const endHour = entryType === ENTRY_TYPE.CHECKOUT ? new Date(timestamp).getHours() : 23
	const endMinute = entryType === ENTRY_TYPE.CHECKOUT ? new Date(timestamp).getMinutes() : 59
	return Math.floor((endHour * 60 + endMinute) / intervalInMinutes)
}

/**
 * Fill buckets from lower to upper bound (with visits) for specific ticket. Based on `intervalDividedBy` - increment zip frequency, age or raw visit.
 * @param buckets Array of bucket. Bucket can contains number, object with age intervals or object with zip codes (based on `intervalDividedBy` value)
 * @param lowerBound  Bottom bucket.
 * @param upperBound  Top bucket.
 * @param ticket  Ticket
 * @param intervalDividedBy Can contains `age`, `zip` or nothing. Specify what is inside of the bucket (how and whether is bucket divided).
 * @param ageInterval How big is the age interval.
 *
 */
const fillBucketsWithVisits = (buckets: any[], lowerBound: number, upperBound: number, ticket: TicketModel, intervalDividedBy: string, ageInterval: number = 10 ) => {
	range(lowerBound, upperBound + 1).forEach((bucket) => {

		if (intervalDividedBy === 'zip') {
			const zip =  ticket.profile.zip ? ticket.profile.zip.split(' ').join('') : i18next.t('none')
			buckets[bucket][zip] = buckets[bucket][zip] ? buckets[bucket][zip] + 1 : 1

		} else if (intervalDividedBy === 'age') {

			let ageBucket
			if (ticket.profile.age) {
				const bucketIndex = Math.floor(ticket.profile.age / ageInterval)
				ageBucket = `${bucketIndex * ageInterval}-${((bucketIndex + 1) * ageInterval) - 1}`
			}
			ageBucket = ticket.profile.age ? ageBucket: i18next.t('none')
			buckets[bucket][ageBucket] = buckets[bucket][ageBucket] ? buckets[bucket][ageBucket] + 1 : 1

		} else {
			buckets[bucket]++
		}
	})
}
