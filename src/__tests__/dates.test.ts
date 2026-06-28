import { describe, it, expect } from 'vitest'
import {
  formatDate, formatDateRange, formatTime, overlapsBreak,
  eachDateInRange, monthGrid, currentOrNextBreak
} from '../utils/dates'
import type { Activity, HolidaySet } from '../types'

const act = (startDate: string, endDate: string): Activity => ({
  id: 'a', name: 'n', provider: 'p', description: '', suburb: 's',
  ageMin: 0, ageMax: 18, categories: ['craft'], cost: 'free',
  registrationRequired: false, startDate, endDate
})

describe('formatDate / formatDateRange', () => {
  it('formats a single date', () => {
    expect(formatDate('2026-07-06')).toBe('6 Jul 2026')
  })
  it('collapses a same-day range', () => {
    expect(formatDateRange('2026-07-06', '2026-07-06')).toBe('6 Jul 2026')
  })
  it('formats a same-month range', () => {
    expect(formatDateRange('2026-07-06', '2026-07-10')).toBe('6–10 Jul 2026')
  })
  it('formats a cross-month range', () => {
    expect(formatDateRange('2026-07-30', '2026-08-02')).toBe('30 Jul – 2 Aug 2026')
  })
})

describe('formatTime', () => {
  it('handles am/pm and noon/midnight', () => {
    expect(formatTime('09:00')).toBe('9:00am')
    expect(formatTime('15:30')).toBe('3:30pm')
    expect(formatTime('12:00')).toBe('12:00pm')
    expect(formatTime('00:00')).toBe('12:00am')
  })
})

describe('overlapsBreak', () => {
  const brk = { name: 'Winter', start: '2026-07-06', end: '2026-07-19' }
  it('includes activities inside the window', () => {
    expect(overlapsBreak(act('2026-07-08', '2026-07-08'), brk)).toBe(true)
  })
  it('includes activities straddling the boundary', () => {
    expect(overlapsBreak(act('2026-07-19', '2026-07-25'), brk)).toBe(true)
  })
  it('excludes activities entirely outside', () => {
    expect(overlapsBreak(act('2026-08-01', '2026-08-05'), brk)).toBe(false)
  })
})

describe('eachDateInRange', () => {
  it('is inclusive of both ends', () => {
    expect(eachDateInRange('2026-07-06', '2026-07-08')).toEqual([
      '2026-07-06', '2026-07-07', '2026-07-08'
    ])
  })
  it('returns a single day for an equal range', () => {
    expect(eachDateInRange('2026-07-06', '2026-07-06')).toEqual(['2026-07-06'])
  })
  it('falls back to the start when the range is reversed', () => {
    expect(eachDateInRange('2026-07-08', '2026-07-06')).toEqual(['2026-07-08'])
  })
})

describe('monthGrid', () => {
  it('produces a 6x7 Monday-first grid', () => {
    const grid = monthGrid(2026, 6) // July 2026 (0-based month)
    expect(grid).toHaveLength(42)
    // 1 July 2026 is a Wednesday → two lead cells (Mon, Tue) from June
    const firstOfMonth = grid.find((c) => c.inMonth && c.day === 1)
    expect(firstOfMonth?.iso).toBe('2026-07-01')
    expect(grid[0].inMonth).toBe(false)
  })
})

describe('currentOrNextBreak', () => {
  const sets: HolidaySet[] = [{
    id: 'moe', name: 'State (MOE)', schoolType: 'state',
    breaks: [
      { name: 'Winter', start: '2026-07-06', end: '2026-07-19' },
      { name: 'Spring', start: '2026-09-28', end: '2026-10-11' }
    ]
  }]
  it('marks a break as current when today is inside it', () => {
    const info = currentOrNextBreak(sets, '2026-07-10')
    expect(info?.brk.name).toBe('Winter')
    expect(info?.status).toBe('current')
  })
  it('picks the next upcoming break otherwise', () => {
    const info = currentOrNextBreak(sets, '2026-08-01')
    expect(info?.brk.name).toBe('Spring')
    expect(info?.status).toBe('upcoming')
  })
})
