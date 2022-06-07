// import { models } from '../../../db/models'

import { models } from '../db/models'
import { azureGetAzureId } from './azureAuthentication'

const { SwimmingLoggedUser } = models

export const getDataAboutCurrentUser = async (req: any) => {
	const oid = await azureGetAzureId(req)
	const swimmingLoggedUser = await SwimmingLoggedUser.findOne({
		attributes: [
			'id',
			'externalId',
			'age',
			'zip',
			'createdAt',
			'updatedAt',
			'deletedAt',
		],
		where: {
			externalId: { [Op.eq]: oid },
		},
	})
	return swimmingLoggedUser
}
