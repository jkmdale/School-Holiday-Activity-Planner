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
import { StorageWriteError } from './services/storage'

interface State {
  activities: Activity[]
  holidaySets: HolidaySet[]
  kids: KidProfile[]
  saved: SavedItem[]
  /** The kid currently in focus for browsing / saving. */
  activeKidId: string | null
  /** The activity open in the detail view, if any. */
  selectedActivityId: string | null
  ready: boolean
  /** Transient message shown to the user (e.g. a save failure). */
  toast: string | null
}

export const state = reactive<State>({
  activities: [],
  holidaySets: [],
  kids: [],
  saved: [],
  activeKidId: null,
  selectedActivityId: null,
  ready: false,
  toast: null
})

let toastTimer: ReturnType<typeof setTimeout> | null = null

/** Show a brief message to the user. Auto-dismisses. */
export function notify(message: string): void {
  state.toast = message
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    state.toast = null
  }, 4000)
}

/** Run a storage mutation, surfacing write failures as a toast. */
async function guard(fn: () => Promise<void>): Promise<void> {
  try {
    await fn()
  } catch (err) {
    if (err instanceof StorageWriteError) {
      notify(err.message)
    } else {
      throw err
    }
  }
}

/* --------------------------- Detail view --------------------------- */

export function openActivity(activityId: string): void {
  state.selectedActivityId = activityId
}

export function closeActivity(): void {
  state.selectedActivityId = null
}

export function selectedActivity(): Activity | null {
  return state.activities.find((a) => a.id === state.selectedActivityId) ?? null
}

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
    await guard(async () => {
      await storage.unsaveActivity(kidId, activityId)
      state.saved = state.saved.filter(
        (s) => !(s.kidId === kidId && s.activityId === activityId)
      )
    })
  } else {
    await guard(async () => {
      await storage.saveActivity(kidId, activityId)
      state.saved = [
        ...state.saved,
        { kidId, activityId, savedAt: new Date().toISOString() }
      ]
    })
  }
}

/** True when every kid (there must be at least one) has this activity saved. */
export function isSavedForAll(activityId: string): boolean {
  if (!state.kids.length) return false
  return state.kids.every((k) => isSaved(k.id, activityId))
}

/**
 * Whole-family toggle: if every kid already has it, remove it from all;
 * otherwise add it for every kid who's missing it. Used in family browse mode.
 */
export async function toggleSaveForAll(activityId: string): Promise<void> {
  if (!state.kids.length) return
  const addToAll = !isSavedForAll(activityId)
  for (const k of state.kids) {
    const has = isSaved(k.id, activityId)
    if (addToAll && !has) await toggleSave(k.id, activityId)
    else if (!addToAll && has) await toggleSave(k.id, activityId)
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
