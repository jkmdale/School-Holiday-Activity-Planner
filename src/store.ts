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
import type { SharedPlan } from './services/share'
import { getForecast, type DayForecast } from './services/weather'
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
  /** A plan received via a share link, awaiting the user's import decision. */
  pendingImport: SharedPlan | null
  /** The device's location, once the user opts into "near me". Never sent away. */
  coords: { lat: number; lng: number } | null
  /** True while a geolocation request is in flight. */
  locating: boolean
  /** Custom-event form: open flag and the id being edited (null = creating). */
  eventForm: { open: boolean; editingId: string | null }
  /** Christchurch forecast by ISO date, once loaded (best-effort, may stay null). */
  forecast: Record<string, DayForecast> | null
}

export const state = reactive<State>({
  activities: [],
  holidaySets: [],
  kids: [],
  saved: [],
  activeKidId: null,
  selectedActivityId: null,
  ready: false,
  toast: null,
  pendingImport: null,
  coords: null,
  locating: false,
  eventForm: { open: false, editingId: null },
  forecast: null
})

/** Load the Christchurch forecast in the background; ignore failures. */
export async function loadForecast(): Promise<void> {
  try {
    state.forecast = await getForecast()
  } catch {
    /* offline or blocked — suggestions just won't be weather-aware */
  }
}

/** True when the forecast says it's likely wet on the given ISO date. */
export function isRainyOn(iso: string): boolean {
  return !!state.forecast?.[iso]?.rainy
}

/* --------------------------- Event form --------------------------- */

/** Open the custom-event form. Pass an id to edit, or nothing to create. */
export function openEventForm(editingId: string | null = null): void {
  state.eventForm = { open: true, editingId }
}

export function closeEventForm(): void {
  state.eventForm = { open: false, editingId: null }
}

/** The activity currently being edited in the form, if any. */
export function editingEvent(): Activity | null {
  const id = state.eventForm.editingId
  return id ? state.activities.find((a) => a.id === id) ?? null : null
}

/* ---------------------------- Geolocation ---------------------------- */

/**
 * Ask the browser for the device location (once). Resolves true on success.
 * The coordinates stay in memory only — never persisted or transmitted.
 */
export function requestLocation(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      notify('Location is not available on this device.')
      resolve(false)
      return
    }
    state.locating = true
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        state.coords = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        state.locating = false
        resolve(true)
      },
      () => {
        state.locating = false
        notify("Couldn't get your location. Check location permissions.")
        resolve(false)
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 }
    )
  })
}

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
  const [activities, holidaySets, kids, saved, custom] = await Promise.all([
    getActivities(),
    getHolidaySets(),
    storage.getKids(),
    storage.getSaved(),
    storage.getCustom()
  ])
  // Catalogue activities plus the parent's own events share one pool, so
  // saving, calendar, export and suggest all treat them identically.
  state.activities = [...activities, ...custom]
  state.holidaySets = holidaySets
  state.kids = kids
  state.saved = saved
  state.activeKidId = kids[0]?.id ?? null
  state.ready = true
  // Best-effort, non-blocking: makes Suggest-a-day weather-aware once it lands.
  void loadForecast()
}

/* ----------------------- Custom (user) activities ----------------------- */

export async function addCustomActivity(
  data: Omit<Activity, 'id'>
): Promise<Activity | null> {
  let created: Activity | null = null
  await guard(async () => {
    created = await storage.addCustom(data)
    state.activities.push(created)
  })
  return created
}

export async function updateCustomActivity(activity: Activity): Promise<void> {
  await guard(async () => {
    await storage.updateCustom(activity)
    const i = state.activities.findIndex((a) => a.id === activity.id)
    if (i !== -1) state.activities[i] = activity
  })
}

export async function removeCustomActivity(activityId: string): Promise<void> {
  await guard(async () => {
    await storage.removeCustom(activityId)
    state.activities = state.activities.filter((a) => a.id !== activityId)
    state.saved = state.saved.filter((s) => s.activityId !== activityId)
    if (state.selectedActivityId === activityId) state.selectedActivityId = null
  })
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

/* ---------------------------- Plan import ---------------------------- */

/** Summary of what a shared plan would add, for the import confirmation UI. */
export function importSummary(plan: SharedPlan): { kids: number; activities: number } {
  const known = new Set(state.activities.map((a) => a.id))
  let activities = 0
  for (const k of plan.kids) {
    activities += k.activityIds.filter((id) => known.has(id)).length
  }
  return { kids: plan.kids.length, activities }
}

/**
 * Merge a shared plan into local data. Kids are matched by name + age so
 * re-importing doesn't duplicate them; only activity ids present in the
 * catalogue are saved.
 */
export async function importSharedPlan(plan: SharedPlan): Promise<void> {
  const known = new Set(state.activities.map((a) => a.id))
  for (const sk of plan.kids) {
    let kid = state.kids.find(
      (k) => k.name.toLowerCase() === sk.name.toLowerCase() && k.age === sk.age
    )
    if (!kid) {
      kid = await addKid({ name: sk.name, age: sk.age, interests: sk.interests ?? [] })
    }
    for (const id of sk.activityIds) {
      if (known.has(id) && !isSaved(kid.id, id)) {
        await toggleSave(kid.id, id)
      }
    }
  }
  state.pendingImport = null
}

/** Saved activities for a kid, newest first, resolved to full Activity objects. */
export function savedActivitiesFor(kidId: string): Activity[] {
  return state.saved
    .filter((s) => s.kidId === kidId)
    .sort((a, b) => b.savedAt.localeCompare(a.savedAt))
    .map((s) => state.activities.find((a) => a.id === s.activityId))
    .filter((a): a is Activity => Boolean(a))
}
