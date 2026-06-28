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
import type { KidProfile, SavedItem } from '../types'

const KIDS_KEY = 'chp.kids.v1'
const SAVED_KEY = 'chp.saved.v1'

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function write<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value))
}

/** Small id helper — good enough for local records. */
function newId(): string {
  return Math.random().toString(36).slice(2, 10)
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
