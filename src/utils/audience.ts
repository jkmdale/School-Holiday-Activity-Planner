/**
 * Gender-fit check, used so the planner doesn't propose a "Boys…" or "Girls…"
 * activity for a child it won't suit. Privacy-first: a child's gender is
 * optional, and when it's unset we never filter (show everything).
 */
import type { Activity } from '../types'

export function audienceFits(
  activity: Pick<Activity, 'audience'>,
  gender?: 'boy' | 'girl' | ''
): boolean {
  const a = activity.audience
  if (!a || a === 'all') return true
  if (!gender) return true // "prefer not to say" → don't filter
  if (a === 'boys') return gender === 'boy'
  if (a === 'girls') return gender === 'girl'
  return true
}
