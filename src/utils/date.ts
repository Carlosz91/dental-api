import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc.js'
import timezone from 'dayjs/plugin/timezone.js'

dayjs.extend(utc)
dayjs.extend(timezone)

export const TZ = 'America/Argentina/Buenos_Aires'

export function nowInTZ(): Date {
  return dayjs().tz(TZ).toDate()
}

export function startOfDayInTZ(date: Date): Date {
  return dayjs(date).tz(TZ).startOf('day').toDate()
}

export function endOfDayInTZ(date: Date): Date {
  return dayjs(date).tz(TZ).endOf('day').toDate()
}

export function formatDateTime(date: Date): string {
  return dayjs(date).tz(TZ).format('YYYY-MM-DD HH:mm')
}

export function parseDateTime(str: string): Date {
  return dayjs.tz(str, TZ).toDate()
}

export function addMinutes(date: Date, minutes: number): Date {
  return dayjs(date).add(minutes, 'minute').toDate()
}