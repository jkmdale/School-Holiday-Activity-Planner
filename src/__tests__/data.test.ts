import { describe, it, expect } from 'vitest'
import activities from '../data/activities.json'
import { CATEGORIES } from '../types'
import type { Activity } from '../types'

const data = activities as Activity[]
const ISO = /^\d{4}-\d{2}-\d{2}$/
const HHMM = /^\d{2}:\d{2}$/
const cats = new Set<string>(CATEGORIES)

describe('activities.json (importer output invariants)', () => {
  it('has activities', () => {
    expect(data.length).toBeGreaterThan(0)
  })

  it('has unique ids', () => {
    const ids = data.map((a) => a.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('every row is well-formed', () => {
    for (const a of data) {
      expect(a.id, a.id).toBeTruthy()
      expect(a.name, a.id).toBeTruthy()
      expect(a.provider, a.id).toBeTruthy()
      expect(a.suburb, a.id).toBeTruthy()

      expect(Number.isInteger(a.ageMin), a.id).toBe(true)
      expect(Number.isInteger(a.ageMax), a.id).toBe(true)
      expect(a.ageMin <= a.ageMax, a.id).toBe(true)

      expect(a.categories.length, a.id).toBeGreaterThan(0)
      for (const c of a.categories) expect(cats.has(c), `${a.id}:${c}`).toBe(true)

      expect(['free', 'paid'], a.id).toContain(a.cost)
      if (a.cost === 'paid') expect(typeof a.price, a.id).toBe('number')

      expect(ISO.test(a.startDate), a.id).toBe(true)
      expect(ISO.test(a.endDate), a.id).toBe(true)
      expect(a.startDate <= a.endDate, a.id).toBe(true)

      if (a.sessionTimes) {
        expect(HHMM.test(a.sessionTimes.start), a.id).toBe(true)
        expect(HHMM.test(a.sessionTimes.end), a.id).toBe(true)
      }
    }
  })

  it('flags the representative-date venues as datesTbc', () => {
    const tbc = data.filter((a) => a.datesTbc)
    expect(tbc.length).toBeGreaterThan(0)
  })
})
