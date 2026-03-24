import { z } from 'zod'
export const requestParts = <
	B extends z.ZodTypeAny,
	Q extends z.ZodTypeAny,
	P extends z.ZodTypeAny
>(parts: {
	body: B
	query: Q
	params: P
}) => z.object(parts)
export const emptyBody = z.record(z.string(), z.unknown()).default({})
export const emptyQuery = z.record(z.string(), z.unknown()).default({})
export const emptyParams = z.record(z.string(), z.unknown()).default({})
