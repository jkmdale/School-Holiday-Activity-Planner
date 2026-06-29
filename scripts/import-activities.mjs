/**
 * Curation importer.
 *
 * Reads the human-edited CSV at data/activities.csv, validates every row, and
 * writes src/data/activities.json (the file the app consumes via dataService).
 * This is the "refresh listings every holiday" workflow: edit the spreadsheet,
 * run `npm run import`, ship.
 *
 * Validation is strict and reports ALL problems with row numbers before exiting
 * non-zero — so a bad paste never silently ships broken data.
 *
 * Usage: node scripts/import-activities.mjs   (or: npm run import)
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const SRC = resolve(ROOT, 'data/activities.csv')
const OUT = resolve(ROOT, 'src/data/activities.json')

// Keep in sync with CATEGORIES in src/types.ts
const CATEGORIES = [
  'physical', 'craft', 'music', 'outdoors',
  'educational', 'performing', 'science', 'social'
]

const COLUMNS = [
  'id', 'name', 'provider', 'description', 'suburb', 'lat', 'lng',
  'ageMin', 'ageMax', 'categories', 'cost', 'price',
  'registrationRequired', 'registrationUrl', 'startDate', 'endDate',
  'sessionStart', 'sessionEnd'
]

/** Minimal RFC-4180-ish CSV parser: handles quoted fields, commas, "" escapes. */
function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ }
        else inQuotes = false
      } else field += c
    } else if (c === '"') {
      inQuotes = true
    } else if (c === ',') {
      row.push(field); field = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(field); field = ''
      if (row.length > 1 || row[0] !== '') rows.push(row)
      row = []
    } else field += c
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row) }
  return rows
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const HHMM = /^\d{2}:\d{2}$/

function isValidDate(s) {
  if (!ISO_DATE.test(s)) return false
  const d = new Date(s + 'T00:00:00')
  return !Number.isNaN(d.getTime())
}

const errors = []
const raw = readFileSync(SRC, 'utf8')
const table = parseCsv(raw)

if (!table.length) {
  console.error('✗ data/activities.csv is empty.')
  process.exit(1)
}

const header = table[0].map((h) => h.trim())
const missingCols = COLUMNS.filter((c) => !header.includes(c))
if (missingCols.length) {
  console.error(`✗ CSV header is missing columns: ${missingCols.join(', ')}`)
  process.exit(1)
}

const idx = Object.fromEntries(header.map((h, i) => [h, i]))
const seenIds = new Set()
const activities = []

for (let r = 1; r < table.length; r++) {
  const cells = table[r]
  const line = r + 1 // 1-based, matching a spreadsheet
  const get = (col) => (cells[idx[col]] ?? '').trim()
  const fail = (msg) => errors.push(`Row ${line}: ${msg}`)

  const id = get('id')
  const name = get('name')
  const provider = get('provider')
  const suburb = get('suburb')

  if (!id) fail('missing id')
  else if (seenIds.has(id)) fail(`duplicate id "${id}"`)
  seenIds.add(id)
  if (!name) fail('missing name')
  if (!provider) fail('missing provider')
  if (!suburb) fail('missing suburb')

  const ageMin = Number(get('ageMin'))
  const ageMax = Number(get('ageMax'))
  if (!Number.isInteger(ageMin) || !Number.isInteger(ageMax)) {
    fail('ageMin/ageMax must be whole numbers')
  } else if (ageMin > ageMax) {
    fail(`ageMin (${ageMin}) is greater than ageMax (${ageMax})`)
  }

  const categories = get('categories').split('|').map((c) => c.trim()).filter(Boolean)
  if (!categories.length) fail('at least one category is required')
  const badCats = categories.filter((c) => !CATEGORIES.includes(c))
  if (badCats.length) fail(`unknown categor(y/ies): ${badCats.join(', ')} (allowed: ${CATEGORIES.join(', ')})`)

  const cost = get('cost')
  if (cost !== 'free' && cost !== 'paid') fail(`cost must be "free" or "paid" (got "${cost}")`)
  const priceRaw = get('price')
  let price
  if (cost === 'paid') {
    if (priceRaw === '') fail('paid activity needs a price')
    else if (Number.isNaN(Number(priceRaw))) fail(`price must be a number (got "${priceRaw}")`)
    else price = Number(priceRaw)
  }

  const regRaw = get('registrationRequired').toLowerCase()
  if (regRaw !== 'true' && regRaw !== 'false') fail('registrationRequired must be true or false')
  const registrationRequired = regRaw === 'true'
  const registrationUrl = get('registrationUrl')

  const startDate = get('startDate')
  const endDate = get('endDate')
  if (!isValidDate(startDate)) fail(`invalid startDate "${startDate}" (use YYYY-MM-DD)`)
  if (!isValidDate(endDate)) fail(`invalid endDate "${endDate}" (use YYYY-MM-DD)`)
  if (isValidDate(startDate) && isValidDate(endDate) && startDate > endDate) {
    fail(`startDate (${startDate}) is after endDate (${endDate})`)
  }

  const sStart = get('sessionStart')
  const sEnd = get('sessionEnd')
  let sessionTimes
  if (sStart || sEnd) {
    if (!HHMM.test(sStart) || !HHMM.test(sEnd)) {
      fail('sessionStart/sessionEnd must both be HH:MM (or both blank)')
    } else {
      sessionTimes = { start: sStart, end: sEnd }
    }
  }

  // Optional: flag rows whose dates are representative / not yet confirmed.
  const tbcRaw = get('datesTbc').toLowerCase()
  if (tbcRaw && tbcRaw !== 'true' && tbcRaw !== 'false') {
    fail(`datesTbc must be true or false (or blank) (got "${tbcRaw}")`)
  }
  const datesTbc = tbcRaw === 'true'

  // Optional weather suitability; infer from the 'outdoors' category when blank.
  const weatherRaw = get('weather').toLowerCase()
  if (weatherRaw && !['indoor', 'outdoor', 'any'].includes(weatherRaw)) {
    fail(`weather must be indoor, outdoor or any (or blank) (got "${weatherRaw}")`)
  }
  const weather = weatherRaw || (categories.includes('outdoors') ? 'outdoor' : 'any')

  const image = get('image')

  const lat = get('lat')
  const lng = get('lng')

  // Build the object in a stable shape; omit optional empties.
  const activity = { id, name, provider, description: get('description'), suburb }
  if (lat && lng) { activity.lat = Number(lat); activity.lng = Number(lng) }
  activity.ageMin = ageMin
  activity.ageMax = ageMax
  activity.categories = categories
  activity.cost = cost
  if (price !== undefined) activity.price = price
  activity.registrationRequired = registrationRequired
  if (registrationUrl) activity.registrationUrl = registrationUrl
  activity.startDate = startDate
  activity.endDate = endDate
  if (sessionTimes) activity.sessionTimes = sessionTimes
  if (datesTbc) activity.datesTbc = true
  if (weather !== 'any') activity.weather = weather
  if (image) activity.image = image

  activities.push(activity)
}

if (errors.length) {
  console.error(`✗ Import failed — ${errors.length} problem(s) found. Nothing written.\n`)
  for (const e of errors) console.error('  ' + e)
  process.exit(1)
}

mkdirSync(dirname(OUT), { recursive: true })
writeFileSync(OUT, JSON.stringify(activities, null, 2) + '\n')
console.log(`✓ Imported ${activities.length} activities → src/data/activities.json`)
