# Architecture — data model, tag vocabulary, and rules review

This is the proposal the brief asked for before code: the data model, the
exercise tag vocabulary, and a critique of the adaptation rules table.
Step 1 (scaffold) is built; nothing below is implemented yet except where noted.

## Principles

- **Postgres is the source of truth.** The device is a read cache plus an
  offline write queue (IndexedDB) that syncs on next open. Every client write
  carries a client-generated UUID and a client timestamp so replays are
  idempotent.
- **Data sources are fields, not assumptions.** Every metric row records
  `source` (`manual`, and later `healthkit`, `import`), so a Capacitor wrapper
  can add HealthKit without touching business logic.
- **The AI extracts; code programs.** Constraints are structured rows. Plan
  generation and adaptation are deterministic functions over those rows —
  reproducible and unit-testable.
- **Documents are transient.** The uploaded file exists only between upload and
  user confirmation of the extraction. After confirmation we keep structured
  constraints and a short provenance string ("VA rating 40%"), never the file.

## Data model (PostgreSQL)

Enums are Postgres enums; all tables get `id uuid pk`, `created_at`, `updated_at`
unless noted. Names below are the interesting columns only.

### Identity & profile

```
users             firebase_uid (unique), email, display_name,
                  disclaimer_accepted_at        -- the one-time medical gate
profiles          user_id fk, height_cm, birth_year, sex_for_bmr,
                  weight_visible bool default true,   -- weight can be hidden entirely
                  units (metric|imperial)
```

### Constraints (the medical model)

One row per fact, never one blob per document — rows are individually
toggleable on the confirmation screen and individually expirable.

```
constraint_sets   user_id fk, status (draft|confirmed|superseded)
constraints       set_id fk, kind (region_severity | contraindicated_pattern |
                                   load_cap | rom_limit | cardio_ceiling | note),
                  body_region        -- enum, see vocabulary below (nullable)
                  severity (mild|moderate|severe)          -- region_severity
                  pattern            -- movement-pattern enum  (contraindication)
                  exercise_slug, cap_value                 -- load_cap
                  joint, motion, max_degrees               -- rom_limit
                  ceiling (none|low|moderate)              -- cardio_ceiling
                  source_kind (document|manual|pain_event),
                  source_label text,   -- "VA rating 40%", "added by you"
                  confidence numeric,  -- null for manual entries
                  enabled bool,        -- user toggled it off ≠ deleted
                  expires_at           -- pain suppressions decay; doc facts don't
document_jobs     user_id fk, status (uploaded|extracting|awaiting_confirm|
                  confirmed|failed), object_key, deleted_at,
                  unparsed_flags jsonb
                  -- object_key is NULLED and the object deleted at confirm time
```

### Exercise library

```
exercises         slug (unique), name, movement_pattern, axial_load bool,
                  impact_level (none|low|moderate|high),
                  equipment (none|dumbbell|band|machine|barbell|bodyweight),
                  position (standing|seated|supine|prone|quadruped|wheelchair_accessible),
                  intensity_tier (minimum|light|full),
                  joints_loaded  body_region[],
                  rom_demand     jsonb   -- { "knee": 110, ... } degrees required
                  cues text, video_url
exercise_alternatives  exercise_id fk, alternative_id fk, rank
                  -- precomputed same-pattern swap chain, easier→harder
```

Plan generation = `SELECT` from `exercises` filtered by the user's confirmed
constraints (exclude contraindicated patterns, exclude exercises loading
suppressed regions, respect ROM demands vs limits, respect impact ceiling),
then pick by pattern coverage. No LLM anywhere in that path.

### Planning & logging

```
plans             user_id fk, status (active|superseded), params jsonb
planned_days      plan_id fk, date, rest bool
planned_sessions  planned_day_id fk, tier (full|light|minimum)
                  -- three rows per non-rest day; all three are peers
planned_items     planned_session_id fk, exercise_id fk, ord,
                  sets, reps, load_kg, rpe_target
session_logs      user_id fk, planned_session_id fk (nullable — ad-hoc counts),
                  tier_chosen (full|light|minimum|rest), started_at, completed_at,
                  client_uuid unique     -- offline-queue idempotency
set_logs          session_log_id fk, exercise_id fk, set_no,
                  reps, load_kg, rpe, source (manual)
pain_events       user_id fk, body_region, severity (1-3), note,
                  logged_at, suppression_constraint_id fk
adaptation_events user_id fk, rule_key, exercise_id nullable,
                  before jsonb, after jsonb, coach_copy_id nullable
                  -- full audit trail: every change the engine makes is a row,
                  -- and the UI renders FROM these rows
coach_copy_cache  rule_key, params_hash, text   -- aggressive Anthropic cache
```

### Nutrition & body metrics (step 7, modeled now)

```
body_metrics      user_id fk, kind (weight|waist|...), value, unit, measured_on,
                  source (manual)
nutrition_targets user_id fk, effective_from, kcal, protein_g,
                  floor_applied bool    -- true when the hard floor clamped it
food_logs         user_id fk, eaten_on, label, portion (portion-based, no DB),
                  kcal_estimate, source (manual|photo_estimate)
```

## Exercise tag vocabulary

Shared, closed vocabulary — the extractor emits it, the library is tagged with
it, the filter matches on it. One source of truth: `shared/vocabulary.json`
(shipped in step 2), imported by the frontend and validated against by the
backend at startup.

Two deliberate changes from the brief's draft vocabulary, made in step 2:

- **Added `core` and `mobility` movement patterns.** The brief's nine patterns
  can't classify planks, dead bugs, or the stretching/breathing work that the
  Minimum tier and deload weeks are made of. Same-pattern swaps only work if
  a plank can swap to a dead bug rather than to a farmer carry.
- **`wheelchair_accessible` moved from the `position` enum to a
  `wheelchair_ok` boolean.** A seated band row is both `seated` *and*
  chair-friendly; making it a position value forced a choice between two true
  facts. The boolean means "performable from a chair without transfer."

```
movement_pattern   squat | hinge | push_h | push_v | pull_h | pull_v |
                   carry | rotate | gait | core | mobility
body_region        ankle | knee | hip | lumbar | thoracic | cervical |
                   shoulder | elbow | wrist
                   -- one list for joints_loaded, readiness map zones, pain
                   -- events, and extractor regions. The brief's example says
                   -- "left_knee": laterality is a MODIFIER (side: left|right|
                   -- bilateral), not new regions — keeps the matching space small.
impact_level       none | low | moderate | high
equipment          none | dumbbell | band | machine | barbell | bodyweight
position           standing | seated | supine | prone | quadruped |
                   wheelchair_accessible
intensity_tier     minimum | light | full
contraindicated_pattern
                   axial_loading | spinal_flexion_under_load |
                   spinal_extension_under_load | spinal_rotation_under_load |
                   overhead_pressing | deep_knee_flexion_under_load |
                   high_impact | breath_holding_valsalva | unsupported_standing
rom_motion         flexion | extension | abduction | rotation   (per joint)
```

Extractor confidence < 0.7 ⇒ the constraint is applied **and** flagged for the
confirmation screen; low confidence restricts, never permits.

## Adaptation rules table — what I'd change

The table is right in spirit. Five specific problems:

1. **No precedence order.** Multiple rules can fire at once (pain event during
   a deload-eligible week after a 10-day gap). Proposed precedence, highest
   first: **pain suppression → return-from-gap → deload → skip handling →
   RPE progression**. Exactly one volume-level rule applies per session;
   pain suppression composes with everything.

2. **"Completed, RPE 9–10 → reduce 10%" over-reacts to one bad day.** A single
   RPE 9 on a completed session is often sleep, stress, or a flare — reducing
   immediately teaches users to under-report. Proposal: RPE 9 once → hold and
   watch; RPE 9 twice consecutively or RPE 10 once → reduce 10%. Also add a
   **regression floor**: after two consecutive reductions on the same exercise,
   stop reducing and swap to the easier same-pattern alternative instead —
   otherwise repeated hard days walk the load toward zero, which reads as
   punishment.

3. **Progression needs a ceiling too.** "+2.5–5% or +1 rep" every good session
   can outrun tissue tolerance in deconditioned or injured users precisely
   because early sessions feel easy. Cap net load increase per exercise at
   ~5%/week regardless of RPE, and make the first two weeks of any new plan
   progression-free by design (calibration weeks).

4. **Undefined terms.** "3 consecutive good weeks" and "skipped twice" need
   definitions or the engine isn't testable. Proposal: a *good week* = ≥ 80%
   of non-rest days logged at any tier with median RPE ≤ 8. *Skipped twice* =
   the same planned exercise unlogged in two consecutive sessions **where other
   exercises were logged** — a fully skipped day is day-level (re-serve), not
   evidence about any particular exercise. Swapping resets the skip counter.

5. **The streak needs honest semantics.** If skips, rest, and 10-day gaps all
   "don't break the streak," a day-chain streak is meaningless theater and
   users will notice. Make the streak weekly: *consecutive weeks with ≥ 1
   logged action*. It's forgiving for the same reasons the rules are, but it
   never lies.

Two additions the table is missing:

- **Started-but-unfinished session**: treat as completed-with-data (use the
  logged sets' RPE), never as a skip. Quitting mid-session because something
  hurt must not look like absence.
- **Pain-suppression release**: after the 7 days, re-introduce affected
  exercises at −20% load with a gentle note, not at the pre-pain load. Severity
  can scale the window later (mild 4d / moderate 7d / severe 14d + suggest
  provider) — the schema's `expires_at` supports this already.

## Where computation lives (and when a backend becomes mandatory)

Steps 3–5 run **entirely on-device**: constraints persist locally
(localStorage now, IndexedDB when the write queue lands) and the plan
generator is a deterministic filter that runs in the browser. The Pages
deploy is a fully working app without any server.

The backend becomes mandatory at exactly these points, in build order:

1. **Step 6 — medical upload.** Anthropic API keys cannot ship in a browser
   bundle; extraction must be proxied server-side. Document storage and
   deletion also live there.
2. **Cross-device durability.** iOS can evict PWA storage for unused apps.
   Local-only data is acceptable for a demo, not for real users — Postgres
   becomes the source of truth and the client becomes cache + write queue.
3. **Step 9 — push notifications** and any server-side scheduling.
4. **Coach-voice copy** (Anthropic-written sentences) — same key problem as
   extraction; the client only ever reads cached copy from the API.

When the backend deploys, plan generation moves server-side per the brief
(no background sync on iOS PWAs → the server prepares the day), and the
on-device generator that steps 3–5 build stays as the offline fallback.
Same shared vocabulary, same filter semantics — already implemented twice
(Python + TS) against the same seed and tested on both sides.

## Step-1 scaffold (built)

- `frontend/` — Vite + React + TS + Tailwind v4, PWA manifest + service worker,
  install onboarding (in-app-browser detection, animated Share-sheet guide),
  Firebase Auth via `signInWithPopup` behind env config, the design system
  (palette, type, motion, reduced-motion).
- `backend/` — FastAPI skeleton with `/health`, CORS, pydantic-settings config,
  pytest. Postgres wiring lands with step 2.
- `.github/workflows/pages.yml` — builds on `production` and `fabian-branch`;
  deploys to GitHub Pages from `production`.
