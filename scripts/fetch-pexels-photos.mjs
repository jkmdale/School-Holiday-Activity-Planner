/**
 * Fetch a related photo for each activity from the Pexels API and bundle it
 * into public/photos/activities/. Writes src/data/activityPhotos.json mapping
 * activity id -> { url, creator, license, source }.
 *
 * Real per-venue photos already in the overlay (license "Provider", from a
 * page's og:image) are kept; Pexels fills in the rest.
 *
 * Requires PEXELS_API_KEY in the environment. Run via the fetch-photos GitHub
 * Action (the key lives in repo secrets) or locally with the env var set.
 */
import { writeFileSync, readFileSync, mkdirSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const KEY = process.env.PEXELS_API_KEY
if (!KEY) {
  console.error('✗ PEXELS_API_KEY is not set.')
  process.exit(1)
}

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const acts = JSON.parse(readFileSync(resolve(ROOT, 'src/data/activities.json'), 'utf8'))
const overlayPath = resolve(ROOT, 'src/data/activityPhotos.json')
const overlay = existsSync(overlayPath) ? JSON.parse(readFileSync(overlayPath, 'utf8')) : {}
const imgDir = resolve(ROOT, 'public/photos/activities')
mkdirSync(imgDir, { recursive: true })

const STOP = new Set(['kids', 'kid', 'kidsfest', 'fest', 'have', 'a', 'go', 'the', 'for', 'with', 'and', 'at', 'christchurch', '2026', 'workshop', 'programme', 'program', 'holiday', 'holidays', 'free', 'olds', 'yr', 'yrs', 'years', 'old', 'session', 'sessions', 'class', 'classes', 'camp', 'day', 'days', 'to', 'of', 'in', 'on', 'an', 'our', 'your', 'plus', 'adventure', 'experience', 'fun', 'school'])
function topic(a) {
  const w = a.name.toLowerCase()
    .replace(/[0-9]+\s*-\s*[0-9]+/g, ' ')
    .replace(/[0-9]+yr?s?/g, ' ')
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/).filter((x) => x && !STOP.has(x))
  return w.slice(0, 3)
}

async function search(q) {
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&orientation=landscape&per_page=3`
  const r = await fetch(url, { headers: { Authorization: KEY } })
  if (!r.ok) return null
  const j = await r.json()
  return (j.photos && j.photos[0]) || null
}
async function download(url, dest) {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`download ${r.status}`)
  writeFileSync(dest, Buffer.from(await r.arrayBuffer()))
}

let added = 0, kept = 0, none = 0
for (const a of acts) {
  if (overlay[a.id] && overlay[a.id].license === 'Provider') { kept++; continue }
  const t = topic(a)
  const tries = []
  if (t.length) tries.push(`${t.join(' ')} children`)
  if (t.length) tries.push(t.join(' '))
  tries.push(`${a.categories[0]} kids`)
  let p = null
  for (const q of tries) { p = await search(q); if (p) break }
  if (!p) { console.log(`${a.id} (none)`); none++; continue }
  const src = p.src.large || p.src.medium || p.src.original
  try {
    await download(src, resolve(imgDir, `${a.id}.jpg`))
  } catch (e) { console.log(`${a.id} download failed`); none++; continue }
  overlay[a.id] = {
    url: `photos/activities/${a.id}.jpg`,
    creator: p.photographer || 'Pexels',
    license: 'Pexels',
    source: p.url
  }
  added++
  console.log(`${a.id} <- ${p.photographer}`)
}
writeFileSync(overlayPath, JSON.stringify(overlay, null, 2) + '\n')
console.log(`\n✓ Pexels photos added: ${added}, venue photos kept: ${kept}, none: ${none}`)
