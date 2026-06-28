import { describe, it, expect } from 'vitest'
import { suggestDay, timesClash, findClashes } from '../utils/suggest'
import type { Activity, Category } from '../types'

let n = 0
function mk(p: Partial<Activity>): Activity {
  n++
  return {
    id: `a${n}`, name: `A${n}`, provider: 'P', description: '', suburb: 'S',
    ageMin: 0, ageMax: 18, categories: ['craft'], cost: 'free',
    registrationRequired: false,
    startDate: '2026-07-06', endDate: '2026-07-06',
    ...p
  }
}

const window = { from: '2026-07-06', to: '2026-07-19', today: '2026-06-28' }
const noInterest = new Set<Category>()

describe('suggestDay', () => {
  it('returns null when nothing fits the ages', () => {
    const acts = [mk({ ageMin: 15, ageMax: 18 })]
    expect(suggestDay(acts, { ages: [6], interests: noInterest, ...window })).toBeNull()
  })

  it('proposes a non-clashing morning + afternoon combo', () => {
    const acts = [
      mk({ sessionTimes: { start: '09:00', end: '11:00' } }),
      mk({ sessionTimes: { start: '13:00', end: '15:00' } })
    ]
    const s = suggestDay(acts, { ages: [8], interests: noInterest, ...window })
    expect(s).not.toBeNull()
    expect(s!.date).toBe('2026-07-06')
    expect(s!.activities).toHaveLength(2)
  })

  it('never picks two clashing timed activities', () => {
    const acts = [
      mk({ sessionTimes: { start: '09:00', end: '12:00' } }),
      mk({ sessionTimes: { start: '10:00', end: '13:00' } })
    ]
    const s = suggestDay(acts, { ages: [8], interests: noInterest, ...window })
    expect(s!.activities).toHaveLength(1)
  })

  it('requires every kid age to fit (family mode)', () => {
    const acts = [mk({ ageMin: 5, ageMax: 9, sessionTimes: { start: '09:00', end: '11:00' } })]
    // a 12yo doesn't fit → no suggestion
    expect(suggestDay(acts, { ages: [6, 12], interests: noInterest, ...window })).toBeNull()
    // both within range → fits
    expect(suggestDay(acts, { ages: [6, 8], interests: noInterest, ...window })).not.toBeNull()
  })

  it('skips excluded days (try-another-day)', () => {
    const acts = [
      mk({ startDate: '2026-07-06', endDate: '2026-07-06', sessionTimes: { start: '09:00', end: '11:00' } }),
      mk({ startDate: '2026-07-07', endDate: '2026-07-07', sessionTimes: { start: '09:00', end: '11:00' } })
    ]
    const s = suggestDay(acts, {
      ages: [8], interests: noInterest, ...window, exclude: new Set(['2026-07-06'])
    })
    expect(s!.date).toBe('2026-07-07')
  })

  it('never suggests a day before today', () => {
    const acts = [mk({ startDate: '2026-07-06', endDate: '2026-07-06', sessionTimes: { start: '09:00', end: '11:00' } })]
    const s = suggestDay(acts, { ages: [8], interests: noInterest, from: '2026-07-06', to: '2026-07-19', today: '2026-07-10' })
    // 6 Jul is before today (10 Jul) → no eligible day
    expect(s).toBeNull()
  })

  it('prefers indoor activities on a forecast wet day', () => {
    const acts = [
      mk({ weather: 'outdoor', sessionTimes: { start: '09:00', end: '11:00' } }),
      mk({ weather: 'indoor', sessionTimes: { start: '09:00', end: '11:00' } })
    ]
    // Both clash (same time) so only one is picked; rain should tip it to indoor.
    const s = suggestDay(acts, { ages: [8], interests: noInterest, ...window, isRainy: () => true })
    expect(s!.activities).toHaveLength(1)
    expect(s!.activities[0].weather).toBe('indoor')
  })
})

describe('clash detection', () => {
  it('timesClash flags overlapping timed events only', () => {
    const a = mk({ sessionTimes: { start: '09:00', end: '11:00' } })
    const b = mk({ sessionTimes: { start: '10:00', end: '12:00' } })
    const c = mk({ sessionTimes: { start: '11:00', end: '12:00' } }) // touches, no overlap
    const allDay = mk({})
    expect(timesClash(a, b)).toBe(true)
    expect(timesClash(a, c)).toBe(false)
    expect(timesClash(a, allDay)).toBe(false) // all-day never clashes
  })

  it('findClashes returns the ids that overlap something', () => {
    const a = mk({ sessionTimes: { start: '09:00', end: '11:00' } })
    const b = mk({ sessionTimes: { start: '10:00', end: '12:00' } })
    const c = mk({ sessionTimes: { start: '13:00', end: '14:00' } })
    const ids = findClashes([a, b, c])
    expect(ids.has(a.id)).toBe(true)
    expect(ids.has(b.id)).toBe(true)
    expect(ids.has(c.id)).toBe(false)
  })
})
