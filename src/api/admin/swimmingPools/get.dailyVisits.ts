import { ENTRY_TYPE } from '../../../utils/enums';
import Joi from 'joi'
import { Op, Sequelize } from 'sequelize'
import { NextFunction, Request, Response } from 'express'
import { models } from '../../../db/models'
import { map, range } from 'lodash';
import joiDate from '@joi/date'
import { TicketModel } from '../../../db/models/ticket';
import i18next from 'i18next';
import config from 'config'
import { IAppConfig } from '../../../types/interfaces';
import { getAllAges } from '../../../utils/helpers';
const appConfig: IAppConfig = config.get('app')

const JoiDateExtension = Joi.extend(joiDate(Joi))

export const schema = Joi.object().keys({
	body: Joi.object(),
	query: Joi.object().keys({
		intervalInMinutes: Joi.number().min(10).max(720).default(60),
		intervalDividedBy: Joi.string().valid('age', 'zip'),
		ageInterval: Joi.number().default(10),
		ageMinimum: Joi.number().default(0),
		day: JoiDateExtension.date().format(['YYYY-MM-DD']).raw().required()
	}),
	params: Joi.object().keys({
		swimmingPoolId: Joi.string().guid({version: ['uuidv4']}).required()
	})
})

const NUMBER_OF_ZIP_CODES = 5 // if value of unique zip codes is less than this number, then show all

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
		const tempBuckets = map(range(0, numberOfBuckets), () => (query.intervalDividedBy ? {} as any : 0))

		if (query.intervalDividedBy === 'age') {
			initializeAgeBuckets(buckets, query.ageInterval, query.ageMinimum)
		}

		const uniqueZips = [...new Set(map(tickets, (ticket)=> ticket.profile.zip))];

		for (const ticket of tickets) {
			ticket.entries.sort((a,b) => (
				a.timestamp > b.timestamp ? 1 : -1
			))

			let startEntry = ticket.entries[0]
			// iterate over ticket entries and find all visits
			for (const [_index, entry] of ticket.entries.entries()) {
				if (startEntry.type === ENTRY_TYPE.CHECKIN) {

					// when entry has CHECK-IN and CHECK-OUT - then record visit
					if (entry.type === ENTRY_TYPE.CHECKOUT) {

						const lowerBound = getBucketIndex(startEntry.timestamp, query.intervalInMinutes)
						const upperBound = getBucketIndex(entry.timestamp, query.intervalInMinutes)
						fillBucketsWithVisits(buckets, tempBuckets, lowerBound, upperBound, ticket, query.intervalDividedBy, query.ageInterval, query.ageMinimum, uniqueZips.length)
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
 * @param ageMinimum Start age.
 *
 */
const initializeAgeBuckets = (buckets: any[], ageInterval: number, ageMinimum: number) => {
	for (const interval of buckets) {

		for (const age of getAllAges(ageInterval, ageMinimum)) {
			interval[age === null ? i18next.t('none') : age ] = 0
		}
	}
}

/**
 * Get bucket index based on the timestamp.
 * @param timestamp Timestamp of the entry.
 * @param intervalInMinutes How big is day interval in the minutes.
 *
 */
const getBucketIndex = (timestamp: Date, intervalInMinutes: number) => {
	const startHour = new Date(timestamp).getHours()
	const startMinute = new Date(timestamp).getMinutes()
	return  Math.floor((startHour * 60 + startMinute) / intervalInMinutes)
}

/**
 * Fill buckets from lower to upper bound (with visits) for specific ticket. Based on `intervalDividedBy` - increment zip frequency, age or raw visit.
 * @param buckets Array of buckets. Bucket can contains number, object with age intervals or object with zip codes (based on `intervalDividedBy` value)
 * @param tempBuckets Array of temp buckets.
 * @param lowerBound  Bottom bucket.
 * @param upperBound  Top bucket.
 * @param ticket  Ticket
 * @param intervalDividedBy Can contains `age`, `zip` or nothing. Specify what is inside of the bucket (how and whether is bucket divided).
 * @param ageInterval How big is the age interval.
 * @param ageMinimum Age start
 * @param numberOfZipCodes Number unique of zip codes.
 *
 */
const fillBucketsWithVisits = (buckets: any[], 
	tempBuckets: any[], 
	lowerBound: number, 
	upperBound: number, 
	ticket: TicketModel, 
	intervalDividedBy: string, 
	ageInterval: number, 
	ageMinimum: number, 
	numberOfZipCodes: number
) => {
	range(lowerBound, upperBound + 1).forEach((bucket) => {

		if (intervalDividedBy === 'zip') {
			const zip =  ticket.profile.zip ? ticket.profile.zip.split(' ').join('') : i18next.t('none')
			tempBuckets[bucket][zip] = tempBuckets[bucket][zip] ? tempBuckets[bucket][zip] + 1 : 1
			if (numberOfZipCodes < NUMBER_OF_ZIP_CODES || tempBuckets[bucket][zip] >= appConfig.minZipCodeFrequency) { // save only frequent zip
				buckets[bucket][zip] = tempBuckets[bucket][zip]
			}

		} else if (intervalDividedBy === 'age') {

			let ageBucket
			if (ticket.profile.age) {
				const bucketIndex = Math.floor((ticket.profile.age + ageMinimum) / ageInterval)
				const min = bucketIndex * ageInterval + ageMinimum
				const max = ((bucketIndex + 1) * ageInterval) - 1 + ageMinimum
				ageBucket = `${min}-${max}`
			}
			ageBucket = ticket.profile.age ? ageBucket: i18next.t('none')
			if (ageBucket in buckets[bucket]) {
				buckets[bucket][ageBucket] = buckets[bucket][ageBucket] ? buckets[bucket][ageBucket] + 1 : 1
			}
		} else {
			buckets[bucket]++
		}
	})
}
