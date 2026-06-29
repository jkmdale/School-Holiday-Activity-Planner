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
import activityPhotos from '../data/activityPhotos.json'
import holidaysSeed from '../data/holidays.json'
import playgroundsSeed from '../data/playgrounds.json'
import poolsSeed from '../data/pools.json'
import librariesSeed from '../data/libraries.json'

export async function getActivities(): Promise<Activity[]> {
  // Future: return (await fetch('/api/activities')).json()
  // Overlay per-activity related photos (kept separate so `npm run import`,
  // which only writes activities.json, never clobbers them).
  const photos = activityPhotos as Record<
    string,
    { url: string; creator: string; license: string; source: string }
  >
  const base = import.meta.env.BASE_URL
  return (activitiesSeed as Activity[]).map((a) => {
    const p = photos[a.id]
    if (!p || a.image) return a
    // Bundled photos are stored as a base-relative path; provider og:images are
    // absolute URLs and used as-is.
    const image = /^https?:\/\//.test(p.url) ? p.url : base + p.url
    return { ...a, image, imageCredit: { creator: p.creator, license: p.license, source: p.source } }
  })
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
