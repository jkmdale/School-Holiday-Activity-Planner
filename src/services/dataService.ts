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
import type { Activity, HolidaySet, Place } from '../types'
import activitiesSeed from '../data/activities.json'
import holidaysSeed from '../data/holidays.json'
import playgroundsSeed from '../data/playgrounds.json'
import poolsSeed from '../data/pools.json'
import librariesSeed from '../data/libraries.json'

export async function getActivities(): Promise<Activity[]> {
  // Future: return (await fetch('/api/activities')).json()
  return activitiesSeed as Activity[]
}

export async function getHolidaySets(): Promise<HolidaySet[]> {
  // Future: return (await fetch('/api/holiday-sets')).json()
  return holidaysSeed as HolidaySet[]
}

export async function getPlaces(): Promise<Place[]> {
  // Future: return (await fetch('/api/places')).json()
  // Playground rows predate the `kind` field, so default them here.
  const playgrounds = (playgroundsSeed as Omit<Place, 'kind'>[]).map(
    (p) => ({ ...p, kind: 'playground' as const })
  )
  return [...playgrounds, ...(poolsSeed as Place[]), ...(librariesSeed as Place[])]
}
