# Christchurch Holiday Planner

A mobile-first, installable PWA that helps Christchurch (NZ) parents plan the
school holidays. A parent sets up their kids, filters activities to each kid's
age, area, interests and budget, saves the ones they like, and exports them to
their phone calendar.

This is the **MVP**: one city (Christchurch), no accounts, no backend. **All
data stays on the device.**

## What it does

1. **Onboarding** — add one or more kid profiles (name, age, interests). Stored
   on the device.
2. **Browse & filter** — pick a kid to auto-apply their age and interests, then
   refine by suburb, category, cost, and which school-holiday break an activity
   falls in.
3. **Save** — tap the ♡ to save an activity to the selected kid; view a per-kid
   saved plan.
4. **Calendar export** — export a kid's saved plan to a `.ics` file (one VEVENT
   per activity) that imports cleanly into Google and Apple Calendar.
5. **Installable PWA** — add to the home screen; browsing works offline.

The three tabs are **Browse**, **Plan** (saved), and **Kids**.

## Privacy by design

Anything about a child — their profile and saved activities — is stored **only
in this browser, on this device**, and is never sent anywhere. The code keeps a
hard line between:

- **Public seed data** (`dataService.ts`) — the activity catalogue and holiday
  dates, read-only. This is the only part that could ever talk to a server.
- **Local-only data** (`storage.ts`) — kid profiles and saved items. No network
  calls live in this file, on purpose.

## Run it

Requires Node 18+.

```bash
npm install
npm run dev        # start the dev server (http://localhost:5173)
npm run build      # type-check + production build into dist/
npm run preview    # serve the production build locally
```

To try the installable PWA / offline behaviour, use `npm run build` then
`npm run preview` (the service worker is only active on a built app).

## Project structure

```
.
├── index.html              # app entry, mobile viewport + theme colour
├── vite.config.ts          # Vite + PWA (manifest, service worker)
├── data/
│   └── activities.csv      # editable activity source (curate here, see below)
├── scripts/
│   └── import-activities.mjs  # validates the CSV → writes src/data/activities.json
├── public/
│   ├── favicon.svg
│   └── icons/              # PWA home-screen icons (192, 512)
└── src/
    ├── main.ts             # bootstraps Vue, registers the service worker
    ├── App.vue             # UI shell + tab navigation
    ├── style.css           # clean, mobile-first styles (no UI framework)
    ├── types.ts            # the domain model (Activity, HolidaySet, KidProfile, SavedItem)
    ├── store.ts            # tiny reactive store over the services
    ├── components/         # Icon, ActivityCard
    ├── views/              # Browse, Saved (Plan), Kids
    ├── utils/              # dates, category metadata
    ├── data/              # seed data
    │   ├── activities.json # GENERATED from data/activities.csv — do not hand-edit
    │   └── holidays.json
    └── services/           # the data layer — swap to a Laravel API here later
        ├── dataService.ts  # PUBLIC seed (activities, holidays), read-only
        ├── storage.ts      # LOCAL-ONLY kid profiles + saved items
        └── ics.ts          # .ics calendar export
```

### The data layer seam

The UI never reads JSON or `localStorage` directly — it goes through the
`services/` modules. To move to a Laravel API later, replace the bodies of
`dataService.ts` (they already return Promises) with `fetch('/api/...')` calls;
the components don't change. `storage.ts` stays local so child data never leaves
the device.

## The seed data

All seed data lives in `src/data/` as plain JSON.

### `activities.json`

One object per activity. Shape (see `src/types.ts` for the authoritative type):

```jsonc
{
  "id": "act-001",
  "name": "Winter Holiday Multisport Camp",
  "provider": "Christchurch Sports Hub",
  "description": "Full-day, action-packed camp …",
  "suburb": "Addington",
  "lat": -43.5408,                // optional
  "lng": 172.6171,               // optional
  "ageMin": 6,
  "ageMax": 12,
  "categories": ["physical", "social"],
  "cost": "paid",               // "free" | "paid"
  "price": 55,                   // optional, NZD, when paid
  "registrationRequired": true,
  "registrationUrl": "https://…", // optional
  "startDate": "2026-07-06",     // ISO date
  "endDate": "2026-07-10",       // ISO date (same as start for one-day)
  "sessionTimes": { "start": "09:00", "end": "15:00" } // optional daily window
}
```

**Categories** (the same list powers a kid's interests and the filters):
`physical`, `craft`, `music`, `outdoors`, `educational`, `performing`,
`science`, `social`.

### `holidays.json`

One object per **calendar set** (a group of schools that share a calendar).
Most Christchurch schools follow `State (MOE)`; independents differ.

```jsonc
{
  "id": "state-moe-2026",
  "name": "State (MOE)",
  "schoolType": "State / State-integrated",
  "notes": "…provenance…",
  "breaks": [
    { "name": "Winter", "start": "2026-07-04", "end": "2026-07-19" }
  ]
}
```

The 2026 dates are seeded from the supplied Christchurch holiday spreadsheet
(State/MOE and St Andrew's College sets).

## Adding activities (the curation workflow)

Activities are hand-curated each holiday — that's deliberate, it's the moat
(complete local listings is what no competitor wants to do by hand). The
editable source of truth is a spreadsheet-friendly CSV; a small script
validates it and generates the JSON the app reads.

```
data/activities.csv          ← you edit this (open in Excel/Sheets/Numbers)
        │  npm run import
        ▼
src/data/activities.json     ← generated; the app consumes this. Don't hand-edit.
```

**To add or update activities each break:**

1. Open `data/activities.csv` in any spreadsheet app.
2. Add a row per activity. Columns map 1:1 to the activity fields:
   - `id` (unique), `name`, `provider`, `description`, `suburb`
   - `lat`,`lng` (optional, leave blank)
   - `ageMin`,`ageMax` (whole numbers)
   - `categories` — one or more, **pipe-separated**, e.g. `physical|outdoors`
   - `cost` (`free`/`paid`), `price` (NZD, required when paid)
   - `registrationRequired` (`true`/`false`), `registrationUrl` (optional)
   - `startDate`,`endDate` (ISO `YYYY-MM-DD`; same value for a one-day activity)
   - `sessionStart`,`sessionEnd` (`HH:MM`, optional — both or neither)
3. Run `npm run import`.
4. The script validates every row and **refuses to write if anything is wrong**,
   listing each problem with its row number (bad category, ageMin > ageMax,
   malformed date, missing price on a paid activity, duplicate id, …). Fix and
   re-run.
5. On success it writes `src/data/activities.json`. `npm run dev` hot-reloads.

`categories` must come from: `physical`, `craft`, `music`, `outdoors`,
`educational`, `performing`, `science`, `social` (kept in sync with
`src/types.ts`).

### Where the seed data comes from

The starter batch is real Christchurch **KidsFest 2026** winter-break listings
(Council Gondola/Tram offers, Parakiore, Adventure Park, Air Force Museum,
libraries, Orana, and KidsFest shows). Good sources to refresh from each break:
**KidsFest** (council-coordinated winter festival), **CINCH** (Council/Libraries
directory, `cinch@ccc.govt.nz`), **Christchurch City Libraries** holiday
programmes, **CCC What's On / Newsline**, **Eventfinda** (has a developer API),
and the **WINZ OSCAR-approved provider** list. Some session times/ages in the
starter batch are indicative — confirm against the live listing before a real
launch.

## Calendar export (`services/ics.ts`)

The headline feature builds an RFC 5545 `.ics` with one `VEVENT` per saved
activity. Design choices made for clean Google/Apple import:

- **Single-day with a session time** → a timed event in *floating* local time
  (no `Z`/`TZID`), so "9:00am at the venue" stays 9:00am on any device.
- **Multi-day camps** → an all-day event spanning the dates (`DTEND` is the
  exclusive day after the last day, per the spec), with the daily time in the
  description — this avoids the event looking like one long overnight session.
- **Single-day with no time** → a one-day all-day event.

Output uses CRLF endings and 75-octet line folding. Tested end-to-end (add kid
→ filter → save → export) with a real browser download.

## Out of scope (deliberately)

No accounts, server/database, provider self-service, payments, reviews,
notifications, multiple cities, or native app. Clean seams are left for these,
but they are not built.
