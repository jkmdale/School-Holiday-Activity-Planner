/**
 * Co-parent plan sharing — fully local, no backend.
 *
 * A plan (kids + the activities saved for each) is encoded into a compact
 * base64url string and carried in the URL hash. The other parent opens the
 * link on their device and chooses to import it; nothing is uploaded anywhere.
 *
 * Only the data the parent chooses to share travels in the link: each kid's
 * name, age, interests and saved activity ids. This is user-initiated sharing,
 * the one time child data intentionally leaves the device.
 */
import type { Category, KidProfile } from '../types'
import { state, savedActivitiesFor } from '../store'

const VERSION = 1

/** One kid's shareable slice of a plan. */
export interface SharedKid {
  name: string
  age: number
  interests: Category[]
  /** Activity ids saved for this kid. */
  activityIds: string[]
}

export interface SharedPlan {
  v: number
  kids: SharedKid[]
}

/* ----------------------------- base64url ----------------------------- */

function b64urlEncode(str: string): string {
  const bytes = new TextEncoder().encode(str)
  let bin = ''
  bytes.forEach((b) => (bin += String.fromCharCode(b)))
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function b64urlDecode(s: string): string {
  const padded = s.replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(padded)
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

/* ------------------------------ encode ------------------------------ */

/** Build a shareable plan from the current state (all kids with saves). */
export function buildSharedPlan(): SharedPlan {
  const kids: SharedKid[] = state.kids
    .map((k: KidProfile) => ({
      name: k.name,
      age: k.age,
      interests: k.interests,
      activityIds: savedActivitiesFor(k.id).map((a) => a.id)
    }))
    .filter((k) => k.activityIds.length > 0)
  return { v: VERSION, kids }
}

/** Encode a plan to a base64url payload string. */
export function encodePlan(plan: SharedPlan): string {
  return b64urlEncode(JSON.stringify(plan))
}

/** Full shareable URL pointing at this deployment with the plan in the hash. */
export function buildShareUrl(plan: SharedPlan): string {
  const base = `${location.origin}${location.pathname}`
  return `${base}#plan=${encodePlan(plan)}`
}

/* ------------------------------ decode ------------------------------ */

/** Parse a plan payload; returns null if missing or malformed. */
export function decodePlan(payload: string): SharedPlan | null {
  try {
    const obj = JSON.parse(b64urlDecode(payload)) as SharedPlan
    if (!obj || typeof obj !== 'object' || !Array.isArray(obj.kids)) return null
    // Keep only well-formed kids.
    obj.kids = obj.kids.filter(
      (k) =>
        k &&
        typeof k.name === 'string' &&
        typeof k.age === 'number' &&
        Array.isArray(k.activityIds)
    )
    return obj.kids.length ? obj : null
  } catch {
    return null
  }
}

/** Read an incoming plan from the current URL hash (#plan=…), if any. */
export function readPlanFromHash(): SharedPlan | null {
  const m = location.hash.match(/[#&]plan=([^&]+)/)
  if (!m) return null
  return decodePlan(m[1])
}

/** Remove the plan payload from the URL without reloading. */
export function clearPlanHash(): void {
  history.replaceState(null, '', `${location.origin}${location.pathname}${location.search}`)
}
