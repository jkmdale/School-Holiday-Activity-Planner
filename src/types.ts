/**
 * Domain types for the Christchurch Holiday Planner.
 *
 * Two kinds of data live in this app:
 *  - Public seed data (activities, holiday sets) — shipped as JSON in the repo,
 *    loaded read-only. Later this can be served by a Laravel API instead.
 *  - Local-only data (kid profiles, saved items) — created by the parent and
 *    stored ONLY in their browser. Nothing about a child is ever sent anywhere.
 */

/** Activity categories. Kept as a const array so it doubles as filter options. */
export const CATEGORIES = [
  'physical',
  'craft',
  'music',
  'outdoors',
  'educational',
  'performing',
  'science',
  'social'
] as const

export type Category = (typeof CATEGORIES)[number]

export type Cost = 'free' | 'paid'

/** A holiday-programme activity. Public seed data. */
export interface Activity {
  id: string
  name: string
  provider: string
  description: string
  suburb: string
  lat?: number
  lng?: number
  ageMin: number
  ageMax: number
  categories: Category[]
  cost: Cost
  /** Price in NZD when cost === 'paid'. Omitted/0 for free activities. */
  price?: number
  registrationRequired: boolean
  registrationUrl?: string
  /** ISO date (YYYY-MM-DD), local Christchurch time. */
  startDate: string
  /** ISO date (YYYY-MM-DD). For a single-day activity, same as startDate. */
  endDate: string
  /**
   * True when the dates are representative / not yet confirmed by the provider
   * (e.g. a venue runs "selected days" — pick the exact date when booking).
   * The UI badges these so the calendar and .ics stay trustworthy.
   */
  datesTbc?: boolean
  /**
   * True for activities the parent created themselves (their own events/plans).
   * LOCAL ONLY — these never came from the public catalogue and never leave the
   * device. They're editable/deletable, unlike catalogue activities.
   */
  custom?: boolean
  /**
   * Weather suitability, used to bias suggestions on wet/fine days. 'any' (the
   * default) when it doesn't matter or is unknown.
   */
  weather?: 'indoor' | 'outdoor' | 'any'
  /**
   * Optional daily session window, 24h "HH:MM". When present, calendar export
   * uses these times; otherwise the event is treated as all-day.
   */
  sessionTimes?: {
    start: string
    end: string
  }
}

/** One school-holiday window within a calendar set. */
export interface HolidayBreak {
  /** e.g. "Winter", "Spring". */
  name: string
  /** First day off, ISO date. */
  start: string
  /** Last day off, ISO date. */
  end: string
}

/**
 * A set of holiday breaks for a group of schools that share one calendar.
 * Most Christchurch schools follow "State (MOE)"; independents differ.
 */
export interface HolidaySet {
  id: string
  /** e.g. "State (MOE)", "St Andrew's College (StAC)". */
  name: string
  schoolType: string
  breaks: HolidayBreak[]
  /** Provenance note for the parent ("compiled from MOE…"). */
  notes?: string
}

/* ----------------------------- Local-only ----------------------------- */

/** A child's profile. LOCAL ONLY — never leaves the device. */
export interface KidProfile {
  id: string
  name: string
  /**
   * Age in years. We store age rather than DOB to keep the minimum data about
   * a child. (DOB is offered in the UI as a convenience but converted to age.)
   */
  age: number
  /** Interests, matching Category values, used to pre-filter activities. */
  interests: Category[]
}

/** Links a saved activity to a kid. LOCAL ONLY. */
export interface SavedItem {
  kidId: string
  activityId: string
  /** ISO timestamp the parent saved it, for ordering the saved list. */
  savedAt: string
}
