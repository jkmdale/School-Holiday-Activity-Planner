import { describe, it, expect } from 'vitest'
import { audienceFits } from '../utils/audience'

describe('audienceFits', () => {
  it('allows all-audience activities for anyone', () => {
    expect(audienceFits({ audience: 'all' }, 'girl')).toBe(true)
    expect(audienceFits({}, 'boy')).toBe(true)
  })

  it('matches gendered activities to the child', () => {
    expect(audienceFits({ audience: 'boys' }, 'boy')).toBe(true)
    expect(audienceFits({ audience: 'boys' }, 'girl')).toBe(false)
    expect(audienceFits({ audience: 'girls' }, 'girl')).toBe(true)
    expect(audienceFits({ audience: 'girls' }, 'boy')).toBe(false)
  })

  it('does not filter when gender is unset (prefer not to say)', () => {
    expect(audienceFits({ audience: 'boys' }, '')).toBe(true)
    expect(audienceFits({ audience: 'girls' }, undefined)).toBe(true)
  })
})
