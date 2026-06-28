/**
 * App state — a tiny reactive store.
 *
 * Wraps the two service modules so the views never touch JSON or localStorage
 * directly:
 *  - public catalogue (activities, holiday sets) from dataService
 *  - local-only kids + saved items from storage
 *
 * Keeping it in one small reactive object avoids pulling in a state library for
 * a validation-grade app, while still giving every view a single source of
 * truth.
 */
import { reactive } from 'vue'
import type { Activity, HolidaySet, KidProfile, SavedItem } from './types'
import { getActivities, getHolidaySets } from './services/dataService'
import * as storage from './services/storage'

interface State {
  activities: Activity[]
  holidaySets: HolidaySet[]
  kids: KidProfile[]
  saved: SavedItem[]
  /** The kid currently in focus for browsing / saving. */
  activeKidId: string | null
  ready: boolean
}

export const state = reactive<State>({
  activities: [],
  holidaySets: [],
  kids: [],
  saved: [],
  activeKidId: null,
  ready: false
})

export async function init(): Promise<void> {
  const [activities, holidaySets, kids, saved] = await Promise.all([
    getActivities(),
    getHolidaySets(),
    storage.getKids(),
    storage.getSaved()
  ])
  state.activities = activities
  state.holidaySets = holidaySets
  state.kids = kids
  state.saved = saved
  state.activeKidId = kids[0]?.id ?? null
  state.ready = true
}

/* ------------------------------- Kids ------------------------------- */

export async function addKid(kid: Omit<KidProfile, 'id'>): Promise<KidProfile> {
  const created = await storage.addKid(kid)
  state.kids.push(created)
  if (!state.activeKidId) state.activeKidId = created.id
  return created
}

export async function updateKid(kid: KidProfile): Promise<void> {
  await storage.updateKid(kid)
  const i = state.kids.findIndex((k) => k.id === kid.id)
  if (i !== -1) state.kids[i] = kid
}

export async function removeKid(kidId: string): Promise<void> {
  await storage.removeKid(kidId)
  state.kids = state.kids.filter((k) => k.id !== kidId)
  state.saved = state.saved.filter((s) => s.kidId !== kidId)
  if (state.activeKidId === kidId) {
    state.activeKidId = state.kids[0]?.id ?? null
  }
}

export function activeKid(): KidProfile | null {
  return state.kids.find((k) => k.id === state.activeKidId) ?? null
}

/* ---------------------------- Saved items ---------------------------- */

export function isSaved(kidId: string, activityId: string): boolean {
  return state.saved.some((s) => s.kidId === kidId && s.activityId === activityId)
}

export async function toggleSave(kidId: string, activityId: string): Promise<void> {
  if (isSaved(kidId, activityId)) {
    await storage.unsaveActivity(kidId, activityId)
    state.saved = state.saved.filter(
      (s) => !(s.kidId === kidId && s.activityId === activityId)
    )
  } else {
    await storage.saveActivity(kidId, activityId)
    state.saved = [
      ...state.saved,
      { kidId, activityId, savedAt: new Date().toISOString() }
    ]
  }
}

/** Saved activities for a kid, newest first, resolved to full Activity objects. */
export function savedActivitiesFor(kidId: string): Activity[] {
  return state.saved
    .filter((s) => s.kidId === kidId)
    .sort((a, b) => b.savedAt.localeCompare(a.savedAt))
    .map((s) => state.activities.find((a) => a.id === s.activityId))
    .filter((a): a is Activity => Boolean(a))
}
