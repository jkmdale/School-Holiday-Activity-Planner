/**
 * "Suggest a day" — a small rule-based planner. Given the eligible activities,
 * the kids' ages/interests and a date window (a holiday break), it picks a
 * single day and a non-conflicting combo of activities for it. No backend, no
 * ML — just transparent rules, which is exactly what a parent can trust.
 */
import type { Activity, Category } from '../types'
import { eachDateInRange } from './dates'

export interface DaySuggestion {
  date: string
  activities: Activity[]
}

export interface SuggestOptions {
  /** Every kid's age must fit an activity's range. */
  ages: number[]
  /** Combined interests across the kids (used to rank). */
  interests: Set<Category>
  /** Window start to plan within (inclusive ISO date). */
  from: string
  /** Window end to plan within (inclusive ISO date). */
  to: string
  /** Today, so we never suggest a day in the past. */
  today: string
  /** Days to skip (used by "try another day"). */
  exclude?: Set<string>
  /** Max activities in a day. */
  max?: number
}

function fitsAges(a: Activity, ages: number[]): boolean {
  return ages.every((age) => age >= a.ageMin && age <= a.ageMax)
}

function interestScore(a: Activity, interests: Set<Category>): number {
  if (!interests.size) return 0
  return a.categories.reduce((n, c) => n + (interests.has(c) ? 1 : 0), 0)
}

function activeOn(a: Activity, iso: string): boolean {
  return a.startDate <= iso && a.endDate >= iso
}

/** Two timed activities clash if their windows overlap. All-day ones never clash. */
function clashes(a: Activity, b: Activity): boolean {
  if (!a.sessionTimes || !b.sessionTimes) return false
  return a.sessionTimes.start < b.sessionTimes.end && b.sessionTimes.start < a.sessionTimes.end
}

/**
 * Build a one-day suggestion, or null if nothing fits. Picks the day with the
 * most eligible, interest-matching options, then greedily fills it with a
 * varied, non-clashing combo.
 */
export function suggestDay(
  activities: Activity[],
  opts: SuggestOptions
): DaySuggestion | null {
  const max = opts.max ?? 2
  const exclude = opts.exclude ?? new Set<string>()
  const start = opts.from < opts.today ? opts.today : opts.from
  if (start > opts.to) return null

  const eligible = activities.filter((a) => fitsAges(a, opts.ages))
  if (!eligible.length) return null

  // Score each candidate day in the window.
  let best: { date: string; score: number; items: Activity[] } | null = null
  for (const day of eachDateInRange(start, opts.to)) {
    if (exclude.has(day)) continue
    const onDay = eligible.filter((a) => activeOn(a, day))
    if (!onDay.length) continue

    // Prefer interest matches, then earlier start times, then named order.
    const ranked = [...onDay].sort((x, y) => {
      const di = interestScore(y, opts.interests) - interestScore(x, opts.interests)
      if (di) return di
      const sx = x.sessionTimes?.start ?? '99:99'
      const sy = y.sessionTimes?.start ?? '99:99'
      return sx.localeCompare(sy) || x.name.localeCompare(y.name)
    })

    // Greedily pick a varied, non-clashing combo.
    const items: Activity[] = []
    const usedCats = new Set<Category>()
    for (const a of ranked) {
      if (items.length >= max) break
      if (items.some((i) => i.id === a.id)) continue
      if (items.some((i) => clashes(i, a))) continue
      // Encourage variety: skip a same-category repeat unless we're short on options.
      const sameCat = a.categories.some((c) => usedCats.has(c))
      if (sameCat && ranked.length > max && items.length > 0) continue
      items.push(a)
      a.categories.forEach((c) => usedCats.add(c))
    }
    if (!items.length) continue

    const score =
      items.length * 10 + items.reduce((n, a) => n + interestScore(a, opts.interests), 0)
    if (!best || score > best.score) best = { date: day, score, items }
  }

  return best ? { date: best.date, activities: best.items } : null
}
