/**
 * Date helpers. All seed dates are ISO `YYYY-MM-DD` strings in local
 * Christchurch time, so plain string comparison is enough for ordering and
 * overlap — no timezone maths needed.
 */
import type { Activity, HolidayBreak } from '../types'

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
]

/** "2026-07-06" → "6 Jul 2026". */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return `${d} ${MONTHS[m - 1]} ${y}`
}

/** A friendly range: same day → "6 Jul 2026"; otherwise "6–10 Jul 2026". */
export function formatDateRange(start: string, end: string): string {
  if (start === end) return formatDate(start)
  const [sy, sm, sd] = start.split('-').map(Number)
  const [ey, em, ed] = end.split('-').map(Number)
  if (sy === ey && sm === em) return `${sd}–${ed} ${MONTHS[sm - 1]} ${sy}`
  if (sy === ey) return `${sd} ${MONTHS[sm - 1]} – ${ed} ${MONTHS[em - 1]} ${sy}`
  return `${formatDate(start)} – ${formatDate(end)}`
}

/** "09:00" → "9:00am", "15:00" → "3:00pm". */
export function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number)
  const period = h < 12 ? 'am' : 'pm'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${String(m).padStart(2, '0')}${period}`
}

/** Does an activity's date range overlap a holiday break window? */
export function overlapsBreak(activity: Activity, brk: HolidayBreak): boolean {
  return activity.startDate <= brk.end && activity.endDate >= brk.start
}
