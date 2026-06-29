/**
 * Local storage service — the privacy boundary.
 *
 * Kid profiles and saved items are LOCAL ONLY. They are written to the
 * browser's localStorage on this device and are never transmitted anywhere.
 * There is no network call in this file by design. If a backend is ever added,
 * the public catalogue (dataService.ts) may sync, but this file must stay local
 * so that nothing about a child leaves the device.
 *
 * localStorage is used for the MVP (small data, simple, synchronous). The async
 * Promise signatures leave room to swap in IndexedDB later without UI churn.
 */
import type { Activity, KidProfile, PlayRating, SavedItem } from '../types'

const KIDS_KEY = 'chp.kids.v1'
const SAVED_KEY = 'chp.saved.v1'
const CUSTOM_KEY = 'chp.custom.v1'
const PLAY_KEY = 'chp.playratings.v1'

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

/** Raised when a write fails (most often the localStorage quota). */
export class StorageWriteError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message)
    this.name = 'StorageWriteError'
  }
}

function write<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (err) {
    // Most commonly QuotaExceededError, but private-mode browsers can also
    // throw here. Surface a friendly message rather than crashing a save.
    throw new StorageWriteError(
      "Couldn't save to this device — storage may be full or unavailable.",
      err
    )
  }
}

/** Stable unique id for local records. Falls back if crypto is unavailable. */
function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

/* ------------------------------- Kids ------------------------------- */

export async function getKids(): Promise<KidProfile[]> {
  return read<KidProfile[]>(KIDS_KEY, [])
}

export async function addKid(kid: Omit<KidProfile, 'id'>): Promise<KidProfile> {
  const kids = await getKids()
  const created: KidProfile = { ...kid, id: newId() }
  write(KIDS_KEY, [...kids, created])
  return created
}

export async function updateKid(kid: KidProfile): Promise<void> {
  const kids = await getKids()
  write(KIDS_KEY, kids.map((k) => (k.id === kid.id ? kid : k)))
}

export async function removeKid(kidId: string): Promise<void> {
  const kids = await getKids()
  write(KIDS_KEY, kids.filter((k) => k.id !== kidId))
  // Cascade: drop that kid's saved items too.
  const saved = await getSaved()
  write(SAVED_KEY, saved.filter((s) => s.kidId !== kidId))
}

/* ---------------------------- Saved items ---------------------------- */

export async function getSaved(): Promise<SavedItem[]> {
  return read<SavedItem[]>(SAVED_KEY, [])
}

export async function saveActivity(kidId: string, activityId: string): Promise<void> {
  const saved = await getSaved()
  if (saved.some((s) => s.kidId === kidId && s.activityId === activityId)) return
  write(SAVED_KEY, [
    ...saved,
    { kidId, activityId, savedAt: new Date().toISOString() }
  ])
}

export async function unsaveActivity(kidId: string, activityId: string): Promise<void> {
  const saved = await getSaved()
  write(
    SAVED_KEY,
    saved.filter((s) => !(s.kidId === kidId && s.activityId === activityId))
  )
}

/* -------------------- Custom (user-created) activities -------------------- */

export async function getCustom(): Promise<Activity[]> {
  return read<Activity[]>(CUSTOM_KEY, [])
}

export async function addCustom(data: Omit<Activity, 'id'>): Promise<Activity> {
  const list = await getCustom()
  const created: Activity = { ...data, id: `custom-${newId()}`, custom: true }
  write(CUSTOM_KEY, [...list, created])
  return created
}

export async function updateCustom(activity: Activity): Promise<void> {
  const list = await getCustom()
  write(CUSTOM_KEY, list.map((a) => (a.id === activity.id ? activity : a)))
}

export async function removeCustom(activityId: string): Promise<void> {
  const list = await getCustom()
  write(CUSTOM_KEY, list.filter((a) => a.id !== activityId))
  // Cascade: drop any saved references to this custom event.
  const saved = await getSaved()
  write(SAVED_KEY, saved.filter((s) => s.activityId !== activityId))
}

/* ----------------- Playground ratings (local only) ----------------- */

export async function getPlayRatings(): Promise<Record<string, PlayRating>> {
  return read<Record<string, PlayRating>>(PLAY_KEY, {})
}

export async function setPlayRating(id: string, rating: PlayRating): Promise<void> {
  const all = await getPlayRatings()
  if (rating.stars <= 0 && !rating.note) delete all[id]
  else all[id] = rating
  write(PLAY_KEY, all)
}
