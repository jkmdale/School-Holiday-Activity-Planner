import { describe, it, expect } from 'vitest'
import { buildIcs } from '../services/ics'
import type { Activity } from '../types'

const base: Activity = {
  id: 'a1',
  name: 'Test Activity',
  provider: 'Test Provider',
  description: 'A description.',
  suburb: 'Riccarton',
  ageMin: 5,
  ageMax: 12,
  categories: ['craft'],
  cost: 'free',
  registrationRequired: false,
  startDate: '2026-07-06',
  endDate: '2026-07-06'
}

const NOW = new Date('2026-06-28T01:30:00Z')

describe('buildIcs', () => {
  it('wraps events in a VCALENDAR with required headers', () => {
    const ics = buildIcs([base], NOW)
    expect(ics).toContain('BEGIN:VCALENDAR')
    expect(ics).toContain('VERSION:2.0')
    expect(ics).toContain('END:VCALENDAR')
    expect(ics).toContain('BEGIN:VEVENT')
    expect(ics).toContain('END:VEVENT')
  })

  it('uses CRLF line endings', () => {
    const ics = buildIcs([base], NOW)
    expect(ics).toContain('\r\n')
    expect(ics.split('\r\n').length).toBeGreaterThan(5)
  })

  it('stamps DTSTAMP in UTC from the provided clock', () => {
    const ics = buildIcs([base], NOW)
    expect(ics).toContain('DTSTAMP:20260628T013000Z')
  })

  it('emits a timed floating event for a single day with session times', () => {
    const a: Activity = { ...base, sessionTimes: { start: '09:00', end: '11:30' } }
    const ics = buildIcs([a], NOW)
    expect(ics).toContain('DTSTART:20260706T090000')
    expect(ics).toContain('DTEND:20260706T113000')
    // floating time: no trailing Z on DTSTART/DTEND
    expect(ics).not.toContain('DTSTART:20260706T090000Z')
  })

  it('emits an all-day event with exclusive DTEND for a multi-day camp', () => {
    const a: Activity = { ...base, startDate: '2026-07-06', endDate: '2026-07-10' }
    const ics = buildIcs([a], NOW)
    expect(ics).toContain('DTSTART;VALUE=DATE:20260706')
    // exclusive end = day after the last day
    expect(ics).toContain('DTEND;VALUE=DATE:20260711')
  })

  it('escapes commas and semicolons in text fields', () => {
    const a: Activity = { ...base, name: 'Art, Craft; Fun' }
    const ics = buildIcs([a], NOW)
    expect(ics).toContain('SUMMARY:Art\\, Craft\\; Fun')
  })

  it('folds lines longer than 75 octets with a leading space continuation', () => {
    const a: Activity = { ...base, description: 'x'.repeat(300) }
    const ics = buildIcs([a], NOW)
    for (const line of ics.split('\r\n')) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75)
    }
    // a continuation line begins with a single space
    expect(ics).toMatch(/\r\n /)
  })
})
