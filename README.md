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

**Push notification setup:** run `npx web-push generate-vapid-keys` and set
three environment variables on the service, then redeploy:

| Variable | Value |
|---|---|
| `AF_VAPID_PUBLIC_KEY` | the **Public Key** line (single-line base64url, ~87 chars) |
| `AF_VAPID_PRIVATE_KEY` | the **Private Key** line (single-line base64url, ~43 chars) |
| `AF_VAPID_SUBJECT` | `mailto:you@example.com` — a real address |

Both keys must be the single-line base64url strings. A multi-line PEM block
gets mangled by environment variables and silently breaks every send, and
Apple's push service rejects a `sub` claim pointing at an unreachable domain
— which is why the default placeholder must be replaced. `GET /push/config`
self-checks all three and names anything wrong; the app surfaces that text
verbatim under Limits → Reminders → *Run a check*.

Users then opt in from Limits → Reminders and switch on whichever nudges
they want. Two caveats worth knowing: on iPhone the app must be installed to
the Home Screen (iOS 16.4+), and a free Render instance sleeps when idle —
reminders only send while the server is awake, so keep it warm with a free
uptime pinger (or a paid instance) if the daily nudge matters.

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
9. ✅ **Push notifications** — five kinds of cute nudge (🌱 today's plan, 👟 movement snack, 🍓 food check-in, 🌙 evening check-in, ⭐ weekly celebration), each switched on independently with its own hour and its own rotating message pool. Every pool is tested for banned guilt words. A per-kind "Try it" button and a *Run a check* self-diagnostic (install state → permission → service worker → server reachability → VAPID health → subscription validity) mean a silent failure always names its own cause.

## Weekly plans and movement guides

Setup now includes workout days, preferred weekdays, session length, experience,
plan style, and equipment. Existing users can open **Today → Your weekly plan**
to set these. The starter, balanced, strength, muscle, endurance, mobility, core,
and chair-friendly templates share the same generator as Today and Session.
Saved limits, reported pain, and exercise substitutions still apply. Consecutive
training days include gentle movement; rest days are shown explicitly. Plans
are stored on the device with the profile and can be changed at any time.

Expand any exercise in the library, a weekly plan, or a workout's **Watch movement
& technique** section for a larger two-pose stick figure with playback controls
and its specific cue. The figures illustrate movement families; the cue explains
the exercise variation. Reduced-motion preferences keep the figures still.

If reminders report an invalid `AF_VAPID_SUBJECT`, update that variable in the
Render service's **Environment** settings to `mailto:` followed by your real
contact email address (without surrounding quotes), then save and redeploy.
The backend also accepts a bare email address and adds `mailto:` when sending.
Keep your existing matching VAPID key pair. Once `/push/config` reports
`healthy: true`, turn reminders on and use **Try it** on the device. The service
must stay awake for scheduled sends; a sleeping free instance cannot run the
minute-by-minute reminder loop.

## Flexible locations, meals, and supplements

- In **Your week → Adjust plan**, choose **Use 3 gym + 2 home days**, or
  enable separate home/gym equipment lists and assign your own weekdays.
  Change the location inside a dated workout to override only that date.
  Today and Session use the same location-specific equipment filters. Existing
  profiles keep using their original equipment list until locations are enabled.
- In **Food → Plan meals for your week**, combine an eating pattern (balanced,
  MIND-inspired, Mediterranean-inspired, or vegetarian), a food goal
  (maintenance, gradual gain, or gradual loss), and the lower-cost filter.
  Check foods to exclude, swap suggestions, or save your own daily meal for a
  specific slot. Incompatible choices leave an explicit gap; they never re-add
  excluded ingredients. Prices and nutrition are estimates, and these menus
  are not medical diets or guarantees of allergen avoidance.
- Checking **Eaten** adds the meal to the food diary once. Changing preferences
  keeps already logged food intact. The diary also works without a profile.
  Calorie targets follow the selected food goal; profiles without a weight
  receive standard serving ideas without a personal calorie target.
- **Food → Optional supplements** provides information on creatine,
  pre-workout/caffeine, protein powder, and electrolytes, with NIH/FDA links.
  The opt-in checklist records what the user marks as taken; it does not
  prescribe doses or send reminders.

Preferences, custom meals, date-specific swaps, and checklists are stored on
this device. No new backend services, API keys, or cloud subscriptions are needed.

## Workout history and pink appearance

Open **Workout calendar** from Today, Progress, or Your week. Browse months and
tap a date to see the logged tier, rest day, completed/planned sets, weights in
your chosen units, and recorded effort. New logs also preserve the exercise
names, planned doses, and gym/home location at the time of logging. Quick logs
show their original planned movements without claiming any tracked sets; older
logs display only the details they actually contain. History stays on this device.

Choose **Limits → Appearance → Pink** for blush surfaces, rose accents, and plum
text across the app. The choice persists on this device and stays pink even when
the phone uses dark mode. Auto, Light, and Dark remain available.

## Choose weights or mobility for each day

In **Your week → Adjust plan**, set **Usual gym workout** to **Weights only**
and choose the machines, dumbbells, or barbell available there. Choose the home
workout type separately. **Workout type by weekday** sets recurring exceptions;
**What kind of workout?** inside a dated session changes just that date. Choose
**Use usual choice** to remove a date's exception. The same controls are available
during setup, and the three-gym/two-home preset uses gym weights and home mobility.

Weights-only days keep weighted exercises in Full, Light, and Minimum. Automatic
recovery adjustments shorten the session and reduce sets instead of substituting
mobility. Mobility-only days use mobility movements in every tier. Equipment,
pain reports, chair mode, impact, and range-of-motion limits still filter all
choices. If no matching weights are available, the app explains the gap instead
of inserting an unrelated movement. New calendar entries retain the workout type.
