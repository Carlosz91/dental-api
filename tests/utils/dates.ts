import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc.js'

dayjs.extend(utc)

/** First Monday at least 14 days from now (clinic-local calendar date, YYYY-MM-DD). Always in the future. */
function futureMonday(): dayjs.Dayjs {
  let d = dayjs.utc().add(14, 'day').startOf('day')
  while (d.day() !== 1) d = d.add(1, 'day')
  return d
}

export const MONDAY = futureMonday().format('YYYY-MM-DD')
export const SUNDAY = futureMonday().subtract(1, 'day').format('YYYY-MM-DD')
/** Wednesday of the same week as MONDAY */
export const WEDNESDAY = futureMonday().add(2, 'day').format('YYYY-MM-DD')
/** Clinic-local instant on MONDAY, e.g. at('08:00') -> '<MONDAY>T08:00:00-03:00' */
export const at = (hhmm: string, date: string = MONDAY) => `${date}T${hhmm}:00-03:00`
