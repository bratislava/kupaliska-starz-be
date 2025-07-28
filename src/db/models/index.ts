import 'colors'
import pg from 'pg'
import highlight from 'cli-highlight'
import { forEach } from 'lodash'
import { Sequelize } from 'sequelize'

import * as database from '../../../config/database'
import { ENV } from '../../utils/enums'

// Import define function from database models
import defineUser from './user'
import defineSwimmingPool from './swimmingPool'
import defineFile from './file'
import defineTicket from './ticket'
import defineTicketType from './ticketType'
import defineOrder from './order'
import defineProfile from './profile'
import definePaymentOrder from './paymentOrder'
import definePaymentResponse from './paymentResponse'
import defineSwimmingPoolUser from './swimmingPoolUser'
import defineSwimmingLoggedUser from './swimmingLoggedUser'
import defineAssociatedSwimmer from './associatedSwimmer'
import defineSwimmingPoolTicketType from './swimmingPoolTicketType'
import defineEntryModel from './entry'
import defineGeneralInformation from './generalInformation'
import defineDiscountCodeModel from './discountCode'
import defineDiscountCodeTicketTypeModel from './discountCodeTicketType'
import { logger } from '../../utils/logger'

// NOTE: set true because otherwise BIGINT return string instead of integer https://github.com/sequelize/sequelize/issues/1774
pg.defaults.parseInt8 = true

const env = (process.env.NODE_ENV as ENV) || ENV.development

// eslint-disable-next-line import/namespace
const { url, options: dbOptions } = database[env]

if (dbOptions.logging) {
	dbOptions.logging = (log: string) => {
		logger.info(
			highlight(log, {
				language: 'sql',
				ignoreIllegals: true,
				theme: 'code',
			})
		)
	}
}

const sequelize = new Sequelize(url, dbOptions)

sequelize
	.authenticate()
	.then(
		() =>
			env !== ENV.test &&
			logger.info(
				'Database Connection has been established successfully.'.green
			)
	)
	.catch((e: any) =>
		logger.error(`Unable to connect to the database${e}.`.red)
	)

const models = {
	DiscountCodeTicketType: defineDiscountCodeTicketTypeModel(sequelize),
	Entry: defineEntryModel(sequelize),
	PaymentResponse: definePaymentResponse(sequelize),
	PaymentOrder: definePaymentOrder(sequelize),
	SwimmingPoolTicketType: defineSwimmingPoolTicketType(sequelize),
	Ticket: defineTicket(sequelize),
	Order: defineOrder(sequelize),
	DiscountCode: defineDiscountCodeModel(sequelize),
	TicketType: defineTicketType(sequelize),
	SwimmingPoolUser: defineSwimmingPoolUser(sequelize),
	SwimmingLoggedUser: defineSwimmingLoggedUser(sequelize),
	AssociatedSwimmer: defineAssociatedSwimmer(sequelize),
	User: defineUser(sequelize),
	Profile: defineProfile(sequelize),
	File: defineFile(sequelize),
	SwimmingPool: defineSwimmingPool(sequelize),
	GeneralInformations: defineGeneralInformation(sequelize),
}

forEach(models, (value) => {
	if (typeof value.associate === 'function') {
		value.associate(models)
	}
})

export { sequelize, models }
export default sequelize
