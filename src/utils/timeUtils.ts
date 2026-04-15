import '@js-joda/timezone'
import { ChronoUnit, ZoneId, ZonedDateTime } from '@js-joda/core'

/** Bratislava local time as `HH:mm` — used by ticket entrance logic. */
export const getLocalTimezoneTime = (): string =>
	ZonedDateTime.now(ZoneId.of('Europe/Bratislava'))
		.toLocalTime()
		.truncatedTo(ChronoUnit.MINUTES)
		.toString()

export const getHours = (time: string): number => Number(time.substr(0, 2))

export const getMinutes = (time: string): number => Number(time.substr(3, 2))
