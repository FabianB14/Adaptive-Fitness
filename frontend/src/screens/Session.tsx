import { useMemo, useState } from "react";
import { loadConstraints } from "../lib/constraints";
import { daySignals, effectiveConstraints } from "../lib/engine";
import { addLog, loadLogs, loadPainEvents } from "../lib/logs";
import { generatePlan } from "../lib/planner";
import {
  applySession,
  loadStates,
  resetSwapped,
  saveStates,
  slugsToAvoid,
  suggestion,
  type SessionResult,
} from "../lib/progress";

type TierKey = "full" | "light" | "minimum";

const TIER_NAMES: Record<TierKey, string> = {
  full: "Full",
  light: "Light",
  minimum: "Minimum",
};

interface ItemState {
  loadKg: string; // input text
  done: number;
  rpe?: number;
}

const ACTIVE_KEY = "af.session.v1";

interface StoredSession {
  date: string;
  tier: TierKey;
  items: Record<string, ItemState>;
}

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function loadActive(date: string, tier: TierKey): Record<string, ItemState> {
  try {
    const raw = localStorage.getItem(ACTIVE_KEY);
    if (!raw) return {};
    const s = JSON.parse(raw) as StoredSession;
    return s.date === date && s.tier === tier ? s.items : {};
  } catch {
    return {};
  }
}

function storeActive(date: string, tier: TierKey, items: Record<string, ItemState>) {
  try {
    localStorage.setItem(ACTIVE_KEY, JSON.stringify({ date, tier, items }));
  } catch {
    // In-memory state still drives the session.
  }
}

function clearActive() {
  try {
    localStorage.removeItem(ACTIVE_KEY);
  } catch {
    // Nothing to clear.
  }
}

function median(values: number[]): number | undefined {
  if (values.length === 0) return undefined;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.round(((s[mid - 1] + s[mid]) / 2) * 2) / 2;
}

/**
 * The live session: set-by-set logging, remembered loads with engine
 * suggestions, per-exercise RPE. Ending early is fine — whatever was done
 * counts as done. Survives a refresh via localStorage.
 */
export function Session({ tier }: { tier: TierKey }) {
  const date = todayISO();
  const constraints = useMemo(
    () => effectiveConstraints(loadConstraints(), loadPainEvents(), date),
    [date],
  );
  const [exStates] = useState(() => loadStates());
  const signals = useMemo(() => daySignals(loadLogs(), date), [date]);
  const plan = useMemo(
    () => generatePlan(constraints, date, undefined, slugsToAvoid(exStates)),
    [constraints, date, exStates],
  );
  const items = plan[tier];

  const [state, setState] = useState<Record<string, ItemState>>(() => {
    const stored = loadActive(date, tier);
    const init: Record<string, ItemState> = {};
    for (const item of items) {
      const sug = suggestion(item.exercise.slug, exStates, signals.multiplier, date);
      init[item.exercise.slug] = stored[item.exercise.slug] ?? {
        loadKg: sug.loadKg != null ? String(sug.loadKg) : "",
        done: 0,
      };
    }
    return init;
  });
  const [finished, setFinished] = useState(false);

  function update(slug: string, patch: Partial<ItemState>) {
    const next = { ...state, [slug]: { ...state[slug], ...patch } };
    setState(next);
    storeActive(date, tier, next);
  }

  const totalSets = items.reduce((n, i) => n + i.sets, 0);
  const doneSets = items.reduce((n, i) => n + (state[i.exercise.slug]?.done ?? 0), 0);
  const anyDone = doneSets > 0;

  function finish() {
    const results: SessionResult[] = items.map((i) => {
      const s = state[i.exercise.slug];
      const load = parseFloat(s?.loadKg ?? "");
      return {
        slug: i.exercise.slug,
        setsPlanned: i.sets,
        setsDone: s?.done ?? 0,
        loadKg: Number.isFinite(load) && load > 0 ? load : null,
        rpe: s?.rpe,
      };
    });
    const sessionRpe = median(
      results.filter((r) => r.setsDone > 0 && r.rpe != null).map((r) => r.rpe!),
    );
    addLog(
      date,
      tier,
      sessionRpe,
      results.map(({ slug, setsPlanned, setsDone, loadKg, rpe }) => ({
        slug,
        setsPlanned,
        setsDone,
        loadKg,
        rpe,
      })),
    );
    let states = applySession(loadStates(), results, date);
    states = resetSwapped(states, results.map((r) => r.slug));
    saveStates(states);
    clearActive();
    setFinished(true);
  }

  if (finished) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-6 pb-28 text-center">
        <div className="animate-rise">
          <p className="font-display text-3xl font-semibold text-moss">Session logged</p>
          <p className="mt-2 text-ink/60">
            <span className="font-data">{doneSets}</span> of{" "}
            <span className="font-data">{totalSets}</span> sets — every one of
            them counts. Tomorrow adapts.
          </p>
        </div>
        <a
          href="#/"
          className="animate-rise rounded-xl bg-moss px-8 py-3.5 font-medium text-paper transition-transform active:scale-[0.98] [animation-delay:150ms]"
        >
          Back to Today
        </a>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-5 pb-28 pt-8">
      <header className="animate-rise flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-ink/40">
            {TIER_NAMES[tier]} session
          </p>
          <h1 className="font-display mt-0.5 text-[1.75rem] font-semibold leading-tight">
            Let's work
          </h1>
        </div>
        <a href="#/" className="mt-1 text-sm text-ink/50 underline-offset-2 hover:underline">
          Pause
        </a>
      </header>

      {/* Session progress */}
      <div className="animate-rise [animation-delay:60ms]">
        <div className="h-1.5 overflow-hidden rounded-full bg-mist">
          <div
            className="h-full rounded-full bg-moss transition-[width] duration-500"
            style={{ width: `${totalSets ? (doneSets / totalSets) * 100 : 0}%` }}
          />
        </div>
        <p className="font-data mt-1.5 text-right text-xs text-ink/45">
          {doneSets} / {totalSets} sets
        </p>
      </div>

      <section className="space-y-2.5">
        {items.map((item, idx) => {
          const slug = item.exercise.slug;
          const s = state[slug] ?? { loadKg: "", done: 0 };
          const sug = suggestion(slug, exStates, signals.multiplier, date);
          const isStrength = /×/.test(item.dose);
          const complete = s.done >= item.sets;

          return (
            <div
              key={slug}
              className="animate-rise rounded-3xl border border-mist bg-card p-4 shadow-sm"
              style={{ animationDelay: `${120 + idx * 70}ms` }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{item.exercise.name}</p>
                  <p className="mt-0.5 text-xs text-ink/50">{item.exercise.cue}</p>
                  {item.note && <p className="mt-0.5 text-xs text-ochre">{item.note}</p>}
                  {sug.note && <p className="mt-0.5 text-xs text-periwinkle">{sug.note}</p>}
                </div>
                <span className="font-data shrink-0 text-sm text-ink/60">{item.dose}</span>
              </div>

              <div className="mt-3 flex items-center justify-between gap-3">
                {isStrength ? (
                  <label className="flex items-center gap-1.5 text-xs text-ink/50">
                    <input
                      value={s.loadKg}
                      onChange={(e) =>
                        update(slug, { loadKg: e.target.value.replace(/[^\d.]/g, "") })
                      }
                      inputMode="decimal"
                      placeholder="—"
                      className="font-data w-16 rounded-lg border border-mist bg-paper px-2 py-1.5 text-center text-sm outline-none focus:border-moss"
                      aria-label={`${item.exercise.name} load in kilograms`}
                    />
                    kg
                  </label>
                ) : (
                  <span />
                )}

                {/* Set circles — motion is the haptic here */}
                <div className="flex gap-2" role="group" aria-label="Sets">
                  {Array.from({ length: item.sets }, (_, i) => {
                    const filled = i < s.done;
                    return (
                      <button
                        key={`${i}-${filled}`}
                        aria-label={`Set ${i + 1} ${filled ? "done" : "not done"}`}
                        aria-pressed={filled}
                        onClick={() =>
                          update(slug, { done: i < s.done ? i : i + 1 })
                        }
                        className={`h-11 w-11 rounded-full border text-sm font-medium transition-colors ${
                          filled
                            ? "animate-pop border-moss bg-moss text-paper"
                            : "border-mist bg-paper text-ink/45"
                        }`}
                      >
                        {i + 1}
                      </button>
                    );
                  })}
                </div>
              </div>

              {complete && (
                <div className="mt-3 border-t border-mist pt-3">
                  <p className="text-xs text-ink/55">How hard, 5–10? (optional)</p>
                  <div className="mt-1.5 flex gap-1.5">
                    {[5, 6, 7, 8, 9, 10].map((r) => (
                      <button
                        key={r}
                        aria-pressed={s.rpe === r}
                        onClick={() => update(slug, { rpe: s.rpe === r ? undefined : r })}
                        className={`font-data flex-1 rounded-lg border py-2 text-sm transition-colors ${
                          s.rpe === r
                            ? "border-moss bg-moss text-paper"
                            : "border-mist bg-paper text-ink/60"
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </section>

      <button
        disabled={!anyDone}
        onClick={finish}
        className="animate-rise w-full rounded-xl bg-moss px-6 py-3.5 font-medium text-paper transition-transform active:scale-[0.98] disabled:opacity-40 [animation-delay:500ms]"
      >
        Finish session
      </button>
      <p className="pb-2 text-center text-xs text-ink/45">
        Stopping early is fine — whatever you've done counts as done.
      </p>
    </main>
  );
}
