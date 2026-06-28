/**
 * Date helpers. All seed dates are ISO `YYYY-MM-DD` strings in local
 * Christchurch time, so plain string comparison is enough for ordering and
 * overlap — no timezone maths needed.
 */
import type { Activity, HolidayBreak, HolidaySet } from '../types'

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

/** Today's date as an ISO `YYYY-MM-DD` string in local time. */
export function todayISO(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function isoFromParts(y: number, m: number, d: number): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${y}-${p(m + 1)}-${p(d)}`
}

/** Every ISO date from start to end inclusive. */
export function eachDateInRange(start: string, end: string): string[] {
  const out: string[] = []
  const s = new Date(start + 'T00:00:00')
  const e = new Date(end + 'T00:00:00')
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime()) || s > e) {
    return start ? [start] : out
  }
  const d = new Date(s)
  // Cap to a sane span so a stray multi-month range can't loop forever.
  for (let i = 0; i < 400 && d <= e; i++) {
    out.push(isoFromParts(d.getFullYear(), d.getMonth(), d.getDate()))
    d.setDate(d.getDate() + 1)
  }
  return out
}

export interface CalCell {
  iso: string
  day: number
  inMonth: boolean
}

/** A 6×7 Monday-first grid of calendar cells for the given month (0-based). */
export function monthGrid(year: number, month: number): CalCell[] {
  const first = new Date(year, month, 1)
  const lead = (first.getDay() + 6) % 7 // days before the 1st (Mon-first)
  const cells: CalCell[] = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(year, month, 1 - lead + i)
    cells.push({
      iso: isoFromParts(d.getFullYear(), d.getMonth(), d.getDate()),
      day: d.getDate(),
      inMonth: d.getMonth() === month
    })
  }
  return cells
}

export function monthLabel(year: number, month: number): string {
  return `${MONTHS[month]} ${year}`
}

export interface BreakInfo {
  set: HolidaySet
  brk: HolidayBreak
  /** 'current' if today falls inside it, otherwise 'upcoming'. */
  status: 'current' | 'upcoming'
}

/**
 * The break to surface to the parent: the one on now, else the soonest to come.
 * Prefers the State (MOE) set since most CHCH kids follow it. Returns null when
 * there's nothing current or upcoming.
 */
export function currentOrNextBreak(sets: HolidaySet[], today = todayISO()): BreakInfo | null {
  const preferred = sets.find((s) => /MOE|State/i.test(s.name)) ?? sets[0]
  if (!preferred) return null
  const relevant = preferred.breaks
    .filter((b) => b.end >= today)
    .sort((a, b) => a.start.localeCompare(b.start))
  const next = relevant[0]
  if (!next) return null
  return {
    set: preferred,
    brk: next,
    status: next.start <= today ? 'current' : 'upcoming'
  }
}
