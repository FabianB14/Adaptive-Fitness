# Adaptive Fitness

A progressive web app that reads a person's medical documents, builds a training
and nutrition plan around their actual physical limitations, and adapts that plan
automatically as they train — without ever making them feel like they failed.

Distribution is a URL. Users open it in Safari on iPhone and use
**Share → Add to Home Screen**. No App Store.

## Branches

| Branch | Purpose |
|---|---|
| `production` | Default branch. Every push deploys the frontend to GitHub Pages. |
| `fabian-branch` | Working branch. Develop here, merge into `production` to ship. |

## Live URL

The frontend deploys to GitHub Pages:
**https://fabianb14.github.io/Adaptive-Fitness/**

Deployment runs from `.github/workflows/pages.yml` on every push to
`production`: the workflow builds the frontend and pushes the result to the
`gh-pages` branch, which GitHub Pages serves automatically. If the site ever
shows as disabled, point it back by hand: *Settings → Pages → Deploy from a
branch → `gh-pages` / root*.

> GitHub Pages hosts static files only. It serves the PWA frontend; the FastAPI
> backend deploys separately (DigitalOcean App Platform, per the brief). Until a
> backend URL is configured the app runs in "static preview" mode.

## Stack

- **Frontend:** React + Vite, TypeScript, Tailwind CSS v4, `vite-plugin-pwa`
- **Backend:** Python + FastAPI (skeleton for now; PostgreSQL to come)
- **Auth:** Firebase Auth — `signInWithPopup` only (redirect breaks in Safari)
- **AI:** Anthropic API (document extraction + coaching copy — later build steps)

## Local development

### Frontend

```bash
cd frontend
npm install
npm run dev          # http://localhost:5173
npm run build        # production build in frontend/dist
```

Configuration lives in `frontend/.env.local` (see `frontend/.env.example`):

- `VITE_FIREBASE_*` — Firebase web app config. Without it the app runs and
  shows a "sign-in not configured" state instead of a broken button.
- `VITE_API_BASE` — base URL of the FastAPI backend. Without it the app shows
  "static preview" for server status.

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload   # http://localhost:8000, health at /health
pytest                          # run tests
```

### Deploying the backend on Render

Create a **Web Service** from this repo with:

| Setting | Value |
|---|---|
| Branch | `production` (the default branch — always current) |
| Root Directory | `backend` |
| Build Command | `pip install -r requirements.txt` |
| Start Command | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| Env var | `ANTHROPIC_API_KEY` = your Anthropic API key |
| Env var | `AF_VAPID_PUBLIC_KEY` / `AF_VAPID_PRIVATE_KEY` = for push notifications (optional) |

If Root Directory is left blank, the repo still deploys as-is: the root
`requirements.txt` forwards to `backend/requirements.txt` for the build, and
the root `app/` package forwards `uvicorn app.main:app` to `backend/app` for
the start command. No settings changes needed either way.
Python is pinned to 3.12 via `.python-version`.

Then open the app → Limits → **Upload** and paste the Render URL once
("Connect server"). The URL is remembered on the device — no rebuild needed.
Document extraction and push notifications are the only features that require
the server; everything else runs on-device.

**Push notification setup:** generate VAPID keys with
`npx web-push generate-vapid-keys`, set them as `AF_VAPID_PUBLIC_KEY` and
`AF_VAPID_PRIVATE_KEY` on the service (plus `AF_VAPID_SUBJECT`, a
`mailto:you@example.com` contact), and redeploy. Users then opt in from
Limits → Daily reminder. Caveats worth knowing: on iPhone the app must be
installed to the Home Screen (iOS 16.4+), and a free Render instance sleeps
when idle — reminders only send while the server is awake, so keep it warm
with a free uptime pinger (or a paid instance) if the daily nudge matters.

## Documentation

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — proposed data model, the
  exercise tag vocabulary, and a review of the adaptation rules table
  (what's ambiguous, what's missing, what should change).

## Build order

1. ✅ **Scaffold** — repo, stack, deploy pipeline, Firebase auth wiring, installable PWA shell
2. ✅ **Exercise library** — `shared/` vocabulary + 132-exercise seed, `/exercises` API with constraint-shaped filters, library browser at `#/library`
3. ✅ **Manual constraint entry** — constraint editor at `#/constraints`, deterministic on-device plan generation, live Readiness Map, vitest suite in CI
4. ✅ **Adaptive engine** — every rule row implemented as a pure function with its own test (`lib/engine.ts` / `engine.test.ts`); day logging with RPE feeds it; dashboard shell with bottom tabs
5. ✅ **Nutrition** *(pulled ahead at client request)* — Food tab with calorie ring, Mifflin-St Jeor targets with hard safety floors, portion-based diary, fully usable without tracking weight. Dark mode and the human-figure Readiness Map (man/woman, front/back) landed alongside.
6. ✅ **Session view** — set-by-set logging with remembered loads and engine suggestions, per-exercise RPE, skip-twice→swap plumbing, pain reporting from the body figure
6b. ✅ **Goal intake & polish** — setup wizard (stats → goals → pace) driving calories and goal-weighted plans; running/cardio additions; line-figure pose illustrations on every exercise
7. ✅ **Medical upload** — `/extract` endpoint (Claude reads PDFs/photos in memory, never stores them), plain-language review with per-item toggles at `#/upload`, restriction-only merge into constraints
7b. ✅ **Progress & rewards** *(client request)* — Progress tab: starting → trend → goal for weight (goal clamped to a healthy-BMI floor) and tape measurements, weekly steps/cardio tracking with gentle system-set targets, and an emoji sticker shelf where rewards only ever add — no lost stars, no shame states
8. ✅ **Share cards** — body-free by construction: canvas-rendered cards (streaks, sessions, stickers, movement — never weight, measurements, or calories) shared through the native share sheet with a PNG download fallback. US units (lb, ft/in, inches) landed alongside as a display-only layer — storage stays metric, so switching is instant and lossless.
8b. ✅ **Walk tracking & two-pose figures** *(client request)* — in-app walk tracker (GPS distance → steps via height-based stride, time-based cadence fallback, honest copy about iOS's no-background-pedometer limits for web apps) feeding the weekly activity totals; every exercise figure now animates between its start and end pose (standing → squatting) with a static-ghost fallback for reduced motion.
9. ✅ **Push notifications** — one cute nudge a day (🌱🐢⭐🦋), opt-in from Limits → Daily reminder, at an hour the user picks in their timezone. The message pool is tested for banned guilt words; the welcome push doubles as a live end-to-end test. Custom service worker handles push + notification clicks; subscriptions self-heal by re-registering on every app launch.
