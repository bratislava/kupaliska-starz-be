// import { models } from '../../../db/models'

import { models } from '../db/models'
import ErrorBuilder from './ErrorBuilder'
import { getCognitoIdOfLoggedInUser } from './azureAuthentication'
import { Op } from 'sequelize'

const { SwimmingLoggedUser } = models

export const getDataAboutCurrentUser = async (req: any) => {
	const sub = await getCognitoIdOfLoggedInUser(req)
	if (!sub) throw new ErrorBuilder(401, req.t('error:ticket.userNotFound'))
	const swimmingLoggedUser = await SwimmingLoggedUser.findOne({
		attributes: [
			'id',
			'externalAzureId',
			'externalCognitoId',
			'age',
			'zip',
			'createdAt',
			'updatedAt',
			'deletedAt',
		],
		where: {
			externalCognitoId: { [Op.eq]: sub },
		},
	})
	return swimmingLoggedUser
}
