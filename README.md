# Christchurch Holiday Planner

A mobile-first, installable PWA that helps Christchurch (NZ) parents plan the
school holidays. A parent sets up their kids, filters activities to each kid's
age, area, interests and budget, saves the ones they like, and exports them to
their phone calendar.

This is the **MVP**: one city (Christchurch), no accounts, no backend. **All
data stays on the device.**

> **Status:** scaffold. The project structure, data layer, seed data and PWA
> config are in place and the app runs. The full features (kid onboarding,
> filtering, saving, `.ics` export) are built on top of this scaffold.

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
├── public/
│   ├── favicon.svg
│   └── icons/              # PWA home-screen icons (192, 512)
└── src/
    ├── main.ts             # bootstraps Vue, registers the service worker
    ├── App.vue             # UI shell
    ├── style.css           # light, mobile-first styles (no UI framework)
    ├── types.ts            # the domain model (Activity, HolidaySet, KidProfile, SavedItem)
    ├── data/               # JSON seed data (see below)
    │   ├── activities.json
    │   └── holidays.json
    └── services/           # the data layer — swap to a Laravel API here later
        ├── dataService.ts  # PUBLIC seed (activities, holidays), read-only
        └── storage.ts      # LOCAL-ONLY kid profiles + saved items
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

## How to add activities

1. Open `src/data/activities.json`.
2. Copy an existing entry and edit the fields. Give it a unique `id`.
3. Use a real `suburb`, set `ageMin`/`ageMax`, and pick `categories` from the
   list above so filters and kid matching work.
4. For dated calendar export, set `startDate`/`endDate` (and `sessionTimes` if
   it runs at a set time of day).
5. Save — the dev server hot-reloads.

No build step or database is involved; the JSON is the source of truth for the
MVP.

## Out of scope (deliberately)

No accounts, server/database, provider self-service, payments, reviews,
notifications, multiple cities, or native app. Clean seams are left for these,
but they are not built.
