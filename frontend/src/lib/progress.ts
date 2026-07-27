/**
 * Per-exercise progression state — where the adaptive engine's decisions
 * become concrete loads. Pure functions over a small state record;
 * localStorage-persisted, versioned, cheap to sync later.
 */
import {
  capWeeklyIncrease,
  progressionDecision,
  weekIndex,
  type ProgressionAction,
} from "./engine";
import { type PlanPace } from "./goals";

export interface ExerciseState {
  lastLoadKg: number | null;
  /** Completed-session RPEs, newest last, capped at 6 entries. */
  rpeHistory: number[];
  /** Consecutive load reductions — at 2 the engine swaps easier instead. */
  reductions: number;
  /** Consecutive planned-but-unlogged sessions — at 2 the planner swaps. */
  skips: number;
  /** Load at the start of the current week, for the 5%/week cap. */
  weekLoad?: { week: number; loadKg: number };
}

export type ExerciseStates = Record<string, ExerciseState>;

const KEY = "af.exstate.v1";

const fresh = (): ExerciseState => ({
  lastLoadKg: null,
  rpeHistory: [],
  reductions: 0,
  skips: 0,
});

export function loadStates(): ExerciseStates {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}") as ExerciseStates;
  } catch {
    return {};
  }
}

export function saveStates(states: ExerciseStates): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(states));
  } catch {
    // In-memory state still drives the session.
  }
}

export interface LoadSuggestion {
  loadKg: number | null;
  /** Short delta note for the UI, e.g. "+2.5%" or "easier today". */
  note?: string;
  action: ProgressionAction;
}

function roundHalf(kg: number): number {
  return Math.round(kg * 2) / 2;
}

/** Today's suggested load for an exercise, honoring the progression
    decision, the weekly cap, and the day multiplier (gap/deload). */
export function suggestion(
  slug: string,
  states: ExerciseStates,
  dayMultiplier: number,
  todayISO: string,
  pace: PlanPace = "steady",
): LoadSuggestion {
  const s = states[slug];
  const action = progressionDecision(s?.rpeHistory ?? [], s?.reductions ?? 0);
  if (!s?.lastLoadKg) return { loadKg: null, action };

  let load = s.lastLoadKg;
  let note: string | undefined;
  if (action.kind === "progress") {
    // Aggressive pace takes the bigger step — the 5%/week cap still rules.
    const pct = pace === "aggressive" ? 5 : action.pct;
    const proposed = load * (1 + pct / 100);
    const weekStart =
      s.weekLoad && s.weekLoad.week === weekIndex(todayISO)
        ? s.weekLoad.loadKg
        : load;
    load = capWeeklyIncrease(weekStart, proposed);
    if (load > s.lastLoadKg) note = `+${pace === "aggressive" ? 5 : action.pct}%`;
  } else if (action.kind === "reduce") {
    load = load * (1 - action.pct / 100);
    note = "easier today";
  } else if (action.kind === "swap_easier") {
    note = "swapped in something easier";
  }
  load = load * dayMultiplier;
  return { loadKg: roundHalf(load), note, action };
}

export interface SessionResult {
  slug: string;
  setsPlanned: number;
  setsDone: number;
  loadKg: number | null;
  rpe?: number;
}

/**
 * Fold a finished session into per-exercise state.
 * - ≥1 set done = completed-with-data (never a skip, even if short)
 * - 0 sets done in a finished session = one consecutive skip
 * - reductions counter follows what the engine decided coming in
 */
export function applySession(
  states: ExerciseStates,
  results: SessionResult[],
  todayISO: string,
): ExerciseStates {
  const next: ExerciseStates = { ...states };
  const week = weekIndex(todayISO);

  for (const r of results) {
    const s: ExerciseState = { ...(next[r.slug] ?? fresh()) };

    if (r.setsDone > 0) {
      const incoming = progressionDecision(s.rpeHistory, s.reductions);
      if (incoming.kind === "reduce") s.reductions += 1;
      else if (incoming.kind === "progress") s.reductions = 0;
      if (r.rpe != null) s.rpeHistory = [...s.rpeHistory, r.rpe].slice(-6);
      if (r.loadKg != null && r.loadKg > 0) s.lastLoadKg = r.loadKg;
      s.skips = 0;
      if (s.lastLoadKg != null && (!s.weekLoad || s.weekLoad.week !== week)) {
        s.weekLoad = { week, loadKg: s.lastLoadKg };
      }
    } else {
      s.skips += 1;
    }
    next[r.slug] = s;
  }
  return next;
}

/** Exercises the planner should route around: skipped twice, or reduced
    twice in a row (the regression floor). */
export function slugsToAvoid(states: ExerciseStates): Set<string> {
  const out = new Set<string>();
  for (const [slug, s] of Object.entries(states)) {
    if (s.skips >= 2 || s.reductions >= 2) out.add(slug);
  }
  return out;
}

/** Once a swapped-out exercise sat out (wasn't served today), its counters
    reset so it can return fresh later. */
export function resetSwapped(
  states: ExerciseStates,
  servedSlugs: string[],
): ExerciseStates {
  const served = new Set(servedSlugs);
  const next: ExerciseStates = { ...states };
  for (const [slug, s] of Object.entries(next)) {
    if (served.has(slug)) continue;
    if (s.skips >= 2 || s.reductions >= 2) {
      next[slug] = { ...s, skips: 0, reductions: 0 };
    }
  }
  return next;
}
