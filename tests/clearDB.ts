import { models } from "../src/db/models"

export default async () => {


	for (const model of Object.values(models)) {
		await (model as any).unscoped().destroy({
			where: {},
			force: true,
			truncate: { cascade: true }
		})
	}

}
