import {
	InstanceDestroyOptions,
	Model,
	WhereOptions,
	UpdateOptions,
	FindOptions,
} from 'sequelize'

/* eslint-disable import/prefer-default-export */
export class DatabaseModel extends Model {
	static associate?: (models: any) => void
}

export interface IDestroyOptions extends InstanceDestroyOptions {
	deletedBy: number
	model?: Model
	where?: WhereOptions
}

export interface IUpdateOptions extends UpdateOptions {
	updatedBy: number
	model: Model
	silent: boolean
}

export interface IFindOptions extends FindOptions {
	includeIgnoreAttributes: boolean
}
