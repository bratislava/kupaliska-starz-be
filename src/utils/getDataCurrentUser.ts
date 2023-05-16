// import { models } from '../../../db/models'

import { models } from '../db/models'
import { getCognitoId } from './azureAuthentication'
import { Op } from 'sequelize'

const { SwimmingLoggedUser } = models

export const getDataAboutCurrentUser = async (req: any) => {
	const sub = await getCognitoId(req)
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
