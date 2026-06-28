/**
 * Data service — the single source for PUBLIC seed data (activities, holidays).
 *
 * This is the seam for the future Laravel backend. Today it reads bundled JSON;
 * later, swap the bodies of these functions for `fetch('/api/...')` calls and
 * the UI never has to change. Everything returns Promises for that reason.
 *
 * This module deliberately knows NOTHING about kids or saved items — that data
 * is local-only and lives in storage.ts.
 */
import type { Activity, HolidaySet } from '../types'
import activitiesSeed from '../data/activities.json'
import holidaysSeed from '../data/holidays.json'

export async function getActivities(): Promise<Activity[]> {
  // Future: return (await fetch('/api/activities')).json()
  return activitiesSeed as Activity[]
}

export async function getHolidaySets(): Promise<HolidaySet[]> {
  // Future: return (await fetch('/api/holiday-sets')).json()
  return holidaysSeed as HolidaySet[]
}
