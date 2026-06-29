/**
 * iCalendar (.ics) export — the headline feature.
 *
 * Produces a VCALENDAR with one VEVENT per activity that imports cleanly into
 * Google Calendar and Apple Calendar. Deliberate choices for compatibility:
 *
 *  - Single-day activities WITH a session time → a timed event in *floating*
 *    local time (no Z, no TZID). Both Google and Apple read floating times as
 *    the user's local time, which is what "9:00am at the venue" means.
 *  - Multi-day activities (camps) → an all-day event spanning the range, with
 *    DTEND as the exclusive day after the last day (per RFC 5545). The daily
 *    session window goes in the description. This avoids the classic bug where
 *    a timed multi-day event looks like one long overnight session.
 *  - Single-day with no session time → a one-day all-day event.
 *
 * Output uses CRLF line endings and 75-octet line folding, both required by
 * RFC 5545 for reliable import.
 */
import type { Activity } from '../types'
import { formatTime } from '../utils/dates'

function escapeText(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

/** "2026-07-06" → "20260706". */
function compactDate(iso: string): string {
  return iso.replace(/-/g, '')
}

/** "09:00" → "090000". */
function compactTime(hhmm: string): string {
  return hhmm.replace(':', '') + '00'
}

/** The day after an ISO date, compact — used for the exclusive all-day DTEND. */
function exclusiveEnd(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() + 1)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}${m}${day}`
}

/** A UTC timestamp like 20260628T013000Z for DTSTAMP. */
function utcStamp(now: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return (
    `${now.getUTCFullYear()}${p(now.getUTCMonth() + 1)}${p(now.getUTCDate())}` +
    `T${p(now.getUTCHours())}${p(now.getUTCMinutes())}${p(now.getUTCSeconds())}Z`
  )
}

/** Fold a content line to <=75 octets per line (RFC 5545), continuation = CRLF + space. */
function foldLine(line: string): string {
  const enc = new TextEncoder()
  if (enc.encode(line).length <= 75) return line
  const out: string[] = []
  let current = ''
  let bytes = 0
  for (const ch of line) {
    const chBytes = enc.encode(ch).length
    // Reserve one octet for the leading space on continuation lines.
    const limit = out.length === 0 ? 75 : 74
    if (bytes + chBytes > limit) {
      out.push(current)
      current = ch
      bytes = chBytes
    } else {
      current += ch
      bytes += chBytes
    }
  }
  if (current) out.push(current)
  return out.map((l, i) => (i === 0 ? l : ' ' + l)).join('\r\n')
}

function buildDescription(a: Activity): string {
  const parts: string[] = []
  parts.push(a.description)
  parts.push(`Provider: ${a.provider}`)
  if (a.startDate !== a.endDate && a.sessionTimes) {
    parts.push(
      `Daily ${formatTime(a.sessionTimes.start)}–${formatTime(a.sessionTimes.end)}`
    )
  }
  parts.push(a.cost === 'free' ? 'Cost: Free' : `Cost: $${a.price ?? ''} NZD`)
  if (a.registrationRequired) {
    parts.push(
      a.registrationUrl
        ? `Registration required: ${a.registrationUrl}`
        : 'Registration required.'
    )
  }
  return parts.join('\n')
}

function eventLines(a: Activity, stamp: string): string[] {
  const lines: string[] = ['BEGIN:VEVENT']
  lines.push(`UID:${a.id}@chch-holiday-planner`)
  lines.push(`DTSTAMP:${stamp}`)

  const singleDay = a.startDate === a.endDate
  if (singleDay && a.sessionTimes) {
    lines.push(`DTSTART:${compactDate(a.startDate)}T${compactTime(a.sessionTimes.start)}`)
    lines.push(`DTEND:${compactDate(a.startDate)}T${compactTime(a.sessionTimes.end)}`)
  } else {
    lines.push(`DTSTART;VALUE=DATE:${compactDate(a.startDate)}`)
    lines.push(`DTEND;VALUE=DATE:${exclusiveEnd(a.endDate)}`)
  }

  lines.push(`SUMMARY:${escapeText(a.name)}`)
  lines.push(`DESCRIPTION:${escapeText(buildDescription(a))}`)
  lines.push(`LOCATION:${escapeText(`${a.provider}, ${a.suburb}, Christchurch`)}`)
  if (a.registrationUrl) lines.push(`URL:${a.registrationUrl}`)
  lines.push('END:VEVENT')
  return lines
}

/** Build a complete .ics document for the given activities. */
export function buildIcs(activities: Activity[], now: Date = new Date()): string {
  const stamp = utcStamp(now)
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Fun Days//Christchurch//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH'
  ]
  for (const a of activities) lines.push(...eventLines(a, stamp))
  lines.push('END:VCALENDAR')
  return lines.map(foldLine).join('\r\n') + '\r\n'
}

/** Trigger a download of the .ics for the given activities. */
export function downloadIcs(filename: string, activities: Activity[]): void {
  const blob = new Blob([buildIcs(activities)], {
    type: 'text/calendar;charset=utf-8'
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.ics') ? filename : `${filename}.ics`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
