# ProgressionX — offline personal gym tracker

A single-user PWA. Every split, session, set, weight log and diet plan is
stored in the phone's browser (IndexedDB). There is no server, no login,
and nothing to pay for. Optional AI features call Groq directly from the
device with your own API key.

## Run locally

```sh
npm install
npm run dev        # http://localhost:5173
```

## Bring your data over from the old server

The old FastAPI/Postgres backend is gone; its data comes across as a
`pg_dump` file. Convert it to the app's backup format (needs `pg_restore`
on the machine for custom-format archives):

```sh
npm run extract -- ../backup.sql --email you@example.com --out progressionx-backup.json
```

Then open the app, choose **Restore from a backup** on the first screen and
pick that file. Same file format the **Backup & Restore** page downloads,
so the extractor can be re-run on a newer dump at any time.

To exercise the whole data layer against a backup file without a browser:

```sh
npm run smoke -- progressionx-backup.json
```

## Install on your phone

Deploy the `dist/` folder to any static host and open the URL on the
phone, then **Add to Home Screen**. The service worker caches the app, so
it launches and works offline after the first visit.

```sh
npm run build      # → dist/
```

- **Root hosting** (Cloudflare Pages, Netlify, Vercel, GitHub Pages user
  site): nothing to configure.
- **Sub-path hosting** (GitHub Pages *project* site at
  `https://<user>.github.io/<repo>/`): set `VITE_BASE_PATH=/<repo>/` in
  `.env` before building (see `.env.example`).

Any host that serves `index.html` for unknown paths works. The included
`nginx.conf` / `Dockerfile` do that if you'd rather self-host.

## Keep your data safe

Phone storage is the only copy. **Profile → Backup & Restore → Download
backup** produces one JSON file; keep it in Drive / email / a PC. The app
also asks the browser for persistent storage so the data isn't evicted
under storage pressure — installing to the home screen usually grants it.

## AI features (optional)

Analysis, session plans, the in-session coach, split generation and diet
chat need a Groq API key. Get one at <https://console.groq.com/keys> and
paste it under **Profile → AI Coach**. The key lives in `localStorage` on
that device only and is never written to backups. Everything else works
without it and without a network connection.

## Layout

```
src/
  db/db.ts         Dexie schema — records are stored in the UI's camelCase shape
  local/           Business logic ported from the FastAPI services
    sessions.ts    start / backfill / complete / abandon / reopen, split sync
    sets.ts        add / update / delete, rest derivation, dropset linking
    analytics.ts   session + exercise analytics, dashboard summary, streak
    backup.ts      export / import JSON, persistent-storage request
    ai/            Groq client, prompt builders, AI service
  api/             TanStack Query hooks (same names as before; local bodies)
  pages/           UI — unchanged apart from setup, profile and backup pages
scripts/
  extract-backup.mjs   pg_dump → backup JSON
  smoke-test.ts        data-layer check under fake-indexeddb
```
