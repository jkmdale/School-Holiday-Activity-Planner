import { describe, it, expect } from 'vitest'
import { encodePlan, decodePlan, type SharedPlan } from '../services/share'

/** Mirror of share.ts's base64url encoding, for building test fixtures. */
function b64url(obj: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(obj))
  let bin = ''
  bytes.forEach((b) => (bin += String.fromCharCode(b)))
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

const plan: SharedPlan = {
  v: 1,
  kids: [
    { name: 'Māia', age: 8, interests: ['craft', 'outdoors'], activityIds: ['a1', 'a2'] },
    { name: 'Tama', age: 11, interests: [], activityIds: ['a3'] }
  ]
}

describe('share encode/decode', () => {
  it('round-trips a plan, including unicode names', () => {
    const decoded = decodePlan(encodePlan(plan))
    expect(decoded).toEqual(plan)
  })

  it('produces a URL-safe payload (no +, /, or =)', () => {
    const payload = encodePlan(plan)
    expect(payload).not.toMatch(/[+/=]/)
  })

  it('returns null for malformed payloads', () => {
    expect(decodePlan('not-valid-base64!!')).toBeNull()
    expect(decodePlan('')).toBeNull()
  })

  it('returns null when there are no well-formed kids', () => {
    const empty = encodePlan({ v: 1, kids: [] })
    expect(decodePlan(empty)).toBeNull()
  })

  it('drops malformed kids but keeps valid ones', () => {
    // Hand-build a payload with one bad kid mixed in.
    const mixed = { v: 1, kids: [{ name: 'Ok', age: 7, interests: [], activityIds: ['x'] }, { bogus: true }] }
    const decoded = decodePlan(b64url(mixed))
    expect(decoded?.kids).toHaveLength(1)
    expect(decoded?.kids[0].name).toBe('Ok')
  })
})
