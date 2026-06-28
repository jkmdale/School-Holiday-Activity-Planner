/**
 * Eventfinda → suggestions importer (a TOP-UP source, not the source of truth).
 *
 * Pulls Christchurch kids/holiday events from the Eventfinda v2 API and writes
 * a STAGING CSV (data/eventfinda-suggestions.csv) in the same column format as
 * data/activities.csv. You then review/tidy the rows (especially ageMin/ageMax
 * and categories, which Eventfinda doesn't provide cleanly) and paste the good
 * ones into data/activities.csv, then run `npm run import`.
 *
 * Why staging, not direct: the planner lives on data quality. Eventfinda is a
 * broad listings feed (concerts, markets, one-offs) with no age range and a
 * different category taxonomy, so a human gate keeps junk out.
 *
 * Credentials (never commit these) — get a free key at
 * https://www.eventfinda.co.nz/api/v2/index then:
 *   export EVENTFINDA_USERNAME=you
 *   export EVENTFINDA_PASSWORD=secret
 *
 * Usage:
 *   npm run import:eventfinda                 # fetch with defaults
 *   node scripts/import-eventfinda.mjs --dry-run        # print request, no call
 *   node scripts/import-eventfinda.mjs --selftest       # map a sample event offline
 *   node scripts/import-eventfinda.mjs --categories     # list category ids
 *   node scripts/import-eventfinda.mjs --locations Christchurch   # find a location id
 *   node scripts/import-eventfinda.mjs --category 0 --radius 40 --rows 20
 *
 * Flags: --category <id> --location <id> --point <lng,lat> --radius <km>
 *        --q <keyword> --start <YYYY-MM-DD> --end <YYYY-MM-DD> --rows <n>
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const OUT = resolve(ROOT, 'data/eventfinda-suggestions.csv')
const HOLIDAYS = resolve(ROOT, 'src/data/holidays.json')

const API = 'https://api.eventfinda.co.nz/v2'
// Eventfinda's point param is "x,y" = longitude,latitude. Default ≈ Cathedral Sq.
const CHCH_POINT = '172.6306,-43.5320'

const COLUMNS = [
  'id', 'name', 'provider', 'description', 'suburb', 'lat', 'lng',
  'ageMin', 'ageMax', 'categories', 'cost', 'price',
  'registrationRequired', 'registrationUrl', 'startDate', 'endDate',
  'sessionStart', 'sessionEnd'
]

/* ----------------------------- arg parsing ----------------------------- */

function parseArgs(argv) {
  const flags = {}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a.startsWith('--')) {
      const key = a.slice(2)
      const next = argv[i + 1]
      if (next === undefined || next.startsWith('--')) flags[key] = true
      else { flags[key] = next; i++ }
    }
  }
  return flags
}

function creds() {
  const username = process.env.EVENTFINDA_USERNAME || process.env.EVENTFINDA_USER
  const password = process.env.EVENTFINDA_PASSWORD || process.env.EVENTFINDA_PASS
  return { username, password }
}

function authHeader() {
  const { username, password } = creds()
  if (!username || !password) {
    console.error(
      '✗ Missing credentials. Get a free key at ' +
      'https://www.eventfinda.co.nz/api/v2/index then:\n' +
      '    export EVENTFINDA_USERNAME=you\n' +
      '    export EVENTFINDA_PASSWORD=secret'
    )
    process.exit(2)
  }
  return 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64')
}

/* --------------------------- date-window default --------------------------- */

function todayISO() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/** Default date window = the current/next State (MOE) break from holidays.json. */
function defaultWindow() {
  try {
    const sets = JSON.parse(readFileSync(HOLIDAYS, 'utf8'))
    const moe = sets.find((s) => /MOE|State/i.test(s.name)) ?? sets[0]
    const today = todayISO()
    const next = (moe?.breaks ?? [])
      .filter((b) => b.end >= today)
      .sort((a, b) => a.start.localeCompare(b.start))[0]
    if (next) return { start: next.start, end: next.end }
  } catch { /* fall through */ }
  const start = todayISO()
  const d = new Date(start + 'T00:00:00')
  d.setDate(d.getDate() + 120)
  return { start, end: d.toISOString().slice(0, 10) }
}

/* ------------------------------- mapping ------------------------------- */

function stripHtml(s) {
  return String(s || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&#39;|&rsquo;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function truncate(s, n) {
  return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s
}

/** Heuristic map from free text to our category taxonomy. */
const CATEGORY_RULES = [
  [/\b(sport|run|swim|bike|cycl|climb|skat|ball|gym|martial|defence|defense|parkour|dance)\b/i, 'physical'],
  [/\b(craft|make|art|paint|draw|lego|brick|build|pottery|sew|create)\b/i, 'craft'],
  [/\b(music|sing|band|concert|choir|instrument|ukulele|drum)\b/i, 'music'],
  [/\b(outdoor|park|walk|hike|zoo|farm|garden|adventure|nature|bush|beach)\b/i, 'outdoors'],
  [/\b(learn|stem|code|coding|robot|experiment|library|read|book|workshop|lego education)\b/i, 'educational'],
  [/\b(theatre|theater|show|perform|drama|puppet|magic|circus|act|stage|story|tale)\b/i, 'performing'],
  [/\b(science|space|dinosaur|chemistry|nature lab|museum|discovery)\b/i, 'science']
]

function guessCategories(text) {
  const found = new Set()
  for (const [re, cat] of CATEGORY_RULES) if (re.test(text)) found.add(cat)
  if (!found.size) found.add('social')
  return [...found]
}

/** Pull an age range out of free text, else default to 0–18. */
function guessAges(text) {
  const m =
    text.match(/\b(?:ages?|aged)\s*(\d{1,2})\s*(?:[-–to]+)\s*(\d{1,2})/i) ||
    text.match(/\b(\d{1,2})\s*[-–]\s*(\d{1,2})\s*(?:years|yrs|yo)\b/i)
  if (m) {
    const lo = Number(m[1]); const hi = Number(m[2])
    if (lo <= hi && hi <= 18) return { ageMin: lo, ageMax: hi }
  }
  return { ageMin: 0, ageMax: 18 }
}

function splitDateTime(s) {
  const m = String(s || '').match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}):(\d{2})/)
  if (!m) return { date: '', time: '' }
  return { date: m[1], time: `${m[2]}:${m[3]}` }
}

function pick(...vals) {
  for (const v of vals) if (v !== undefined && v !== null && v !== '') return v
  return undefined
}

/** Map one Eventfinda event object → a CSV row object in our schema. */
export function mapEvent(ev) {
  const text = `${ev.name || ''} ${stripHtml(ev.description)}`
  const start = splitDateTime(ev.datetime_start)
  const end = splitDateTime(ev.datetime_end)
  const startDate = start.date
  const endDate = end.date || start.date
  const singleDay = startDate && startDate === endDate

  const loc = ev.location || {}
  const venue = pick(loc.name, ev.address, 'Eventfinda')
  // suburb: "Venue, Suburb, City" → take the middle token if present
  const summary = String(pick(loc.summary, ev.address, '') || '')
  const parts = summary.split(',').map((p) => p.trim()).filter(Boolean)
  const suburb = parts.length >= 2 ? parts[parts.length - 2] : pick(loc.name, 'Christchurch')

  const lat = pick(ev.point?.lat, ev.point_y, loc.point_latitude, loc.latitude)
  const lng = pick(ev.point?.lng, ev.point_x, loc.point_longitude, loc.longitude)

  const isFree = ev.is_free === true || ev.is_free === 'true' || ev.is_free === 1
  const { ageMin, ageMax } = guessAges(text)

  return {
    id: `ef-${ev.id}`,
    name: ev.name || '',
    provider: venue,
    description: truncate(stripHtml(ev.description), 280),
    suburb,
    lat: lat != null ? lat : '',
    lng: lng != null ? lng : '',
    ageMin,
    ageMax,
    categories: guessCategories(text).join('|'),
    cost: isFree ? 'free' : 'paid',
    price: '', // Eventfinda price needs review — fill before importing if paid
    registrationRequired: 'true',
    registrationUrl: ev.url || '',
    startDate,
    endDate,
    sessionStart: singleDay ? start.time : '',
    sessionEnd: singleDay ? end.time : ''
  }
}

/* ------------------------------- CSV out ------------------------------- */

function csvCell(v) {
  const s = String(v ?? '')
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
}

function toCsv(rows) {
  const lines = [COLUMNS.join(',')]
  for (const r of rows) lines.push(COLUMNS.map((c) => csvCell(r[c])).join(','))
  return lines.join('\n') + '\n'
}

/* ------------------------------- HTTP ------------------------------- */

function buildUrl(flags, win) {
  const params = new URLSearchParams()
  params.set('rows', String(flags.rows || 20))
  params.set('order', 'date')
  if (flags.category) params.set('category', String(flags.category))
  if (flags.location) params.set('location', String(flags.location))
  else { params.set('point', flags.point || CHCH_POINT); params.set('radius', String(flags.radius || 30)) }
  if (flags.q) params.set('q', String(flags.q))
  params.set('start_date', `${flags.start || win.start} 00:00:00`)
  params.set('end_date', `${flags.end || win.end} 23:59:59`)
  return `${API}/events.json?${params.toString()}`
}

async function apiGet(url) {
  const res = await fetch(url, { headers: { Authorization: authHeader() } })
  const body = await res.text()
  if (!res.ok) {
    console.error(`✗ Eventfinda API ${res.status}: ${body.slice(0, 300)}`)
    process.exit(1)
  }
  try { return JSON.parse(body) }
  catch {
    console.error('✗ Could not parse JSON response. First 300 chars:\n' + body.slice(0, 300))
    process.exit(1)
  }
}

/** Defensively find the list array in a v2 response (e.g. data.events). */
function listFrom(data, key) {
  if (Array.isArray(data?.[key])) return data[key]
  if (Array.isArray(data?.[key]?.[key.replace(/s$/, '')])) return data[key][key.replace(/s$/, '')]
  // some responses nest as { "@attributes":..., events:[...] }
  for (const v of Object.values(data || {})) if (Array.isArray(v)) return v
  return []
}

/* ------------------------------- main ------------------------------- */

const SAMPLE_EVENT = {
  id: 123456,
  url: 'https://www.eventfinda.co.nz/2026/sample-kids-craft/christchurch',
  name: 'School Holiday Craft Workshop',
  description: '<p>A fun <b>craft</b> session for ages 5-10. Make and take home your own creations.</p>',
  datetime_start: '2026-07-08 10:00:00',
  datetime_end: '2026-07-08 11:30:00',
  is_free: false,
  point_x: 172.6355,
  point_y: -43.5310,
  address: 'Tūranga, 60 Cathedral Square',
  location: { id: 1, name: 'Tūranga', summary: 'Tūranga, Christchurch Central, Christchurch' }
}

async function main() {
  const flags = parseArgs(process.argv.slice(2))

  if (flags.selftest) {
    const rows = [mapEvent(SAMPLE_EVENT)]
    writeFileSync(OUT, toCsv(rows))
    console.log('✓ selftest: mapped 1 sample event → ' + OUT)
    console.log(JSON.stringify(rows[0], null, 2))
    return
  }

  const win = defaultWindow()

  if (flags.categories) {
    const data = await apiGet(`${API}/categories.json?rows=200`)
    for (const c of listFrom(data, 'categories')) console.log(`${c.id}\t${c.name}`)
    return
  }
  if (flags.locations) {
    const q = flags.locations === true ? 'Christchurch' : flags.locations
    const data = await apiGet(`${API}/locations.json?q=${encodeURIComponent(q)}&rows=25`)
    for (const l of listFrom(data, 'locations')) console.log(`${l.id}\t${l.name}`)
    return
  }

  const url = buildUrl(flags, win)
  console.log('Request: ' + url)
  if (flags['dry-run']) { console.log('(dry run — no call made)'); return }

  const data = await apiGet(url)
  const events = listFrom(data, 'events')
  const rows = events.map(mapEvent).filter((r) => r.startDate)
  writeFileSync(OUT, toCsv(rows))
  console.log(`\n✓ Wrote ${rows.length} suggestion(s) → data/eventfinda-suggestions.csv`)
  console.log(
    'Next: review the rows (especially ageMin/ageMax, categories, and price for\n' +
    'paid events), then paste the good ones into data/activities.csv and run\n' +
    '`npm run import`.'
  )
}

main().catch((e) => { console.error(e); process.exit(1) })
