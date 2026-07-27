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

## Documentation

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — proposed data model, the
  exercise tag vocabulary, and a review of the adaptation rules table
  (what's ambiguous, what's missing, what should change).

## Build order

1. ✅ **Scaffold** — repo, stack, deploy pipeline, Firebase auth wiring, installable PWA shell
2. ✅ **Exercise library** — `shared/` vocabulary + 132-exercise seed, `/exercises` API with constraint-shaped filters, library browser at `#/library`
3. Manual constraint entry — constraint model + editor, plan generation without AI
4. Adaptive engine — deterministic rules with unit tests for every row
5. Three-tier daily view — core loop, logging, the Readiness Map
6. Medical upload — extraction pipeline on top of the working constraint model
7. Nutrition
8. Share cards
9. Push notifications
