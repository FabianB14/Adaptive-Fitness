/**
 * The adaptive engine — step 4. Rules, not AI. Every function here is pure
 * and deterministic; engine.test.ts holds a test for every row of the rules
 * table (including the amendments documented in docs/ARCHITECTURE.md).
 *
 * Rule precedence, highest first:
 *   pain suppression → return-from-gap → deload → skip handling → RPE progression
 */
import { type Constraints } from "./constraints";
import { type PainEvent, type SessionLog } from "./logs";

// ---------------------------------------------------------------- utilities

const DAY_MS = 86_400_000;

export function daysBetween(aISO: string, bISO: string): number {
  return Math.round(
    (Date.parse(bISO + "T00:00:00Z") - Date.parse(aISO + "T00:00:00Z")) / DAY_MS,
  );
}

/** Monday-based week index for grouping logs into weeks. */
export function weekIndex(dateISO: string): number {
  const t = Date.parse(dateISO + "T00:00:00Z");
  // 1970-01-05 was a Monday.
  return Math.floor((t - Date.parse("1970-01-05T00:00:00Z")) / (7 * DAY_MS));
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

// ------------------------------------------------------- RPE progression row

export type ProgressionAction =
  | { kind: "progress"; pct: number } // +2.5–5% load (or +1 rep where loads don't apply)
  | { kind: "hold" }
  | { kind: "reduce"; pct: number }
  | { kind: "swap_easier" };

/**
 * Decide next session's change from completed-session RPEs (newest last).
 *
 * Amended from the brief's table:
 * - RPE 9 once → hold and watch (one bad day is sleep, stress, a flare —
 *   reducing immediately teaches under-reporting). RPE 9 twice in a row or
 *   RPE 10 once → reduce 10%.
 * - Regression floor: after 2 consecutive reductions, swap to an easier
 *   same-pattern alternative instead of shrinking the load forever.
 */
export function progressionDecision(
  rpeHistory: number[],
  consecutiveReductions = 0,
): ProgressionAction {
  if (consecutiveReductions >= 2) return { kind: "swap_easier" };
  const last = rpeHistory[rpeHistory.length - 1];
  if (last === undefined) return { kind: "hold" }; // no data → no change
  if (last === 10) return { kind: "reduce", pct: 10 };
  if (last === 9) {
    const prev = rpeHistory[rpeHistory.length - 2];
    return prev !== undefined && prev >= 9
      ? { kind: "reduce", pct: 10 }
      : { kind: "hold" };
  }
  if (last === 8) return { kind: "hold" };
  return { kind: "progress", pct: 2.5 };
}

/** Weekly ceiling: net load increase per exercise capped at 5%/week no
    matter how good the RPEs look. */
export function capWeeklyIncrease(
  loadAtWeekStart: number,
  proposedLoad: number,
): number {
  return Math.min(proposedLoad, loadAtWeekStart * 1.05);
}

// ---------------------------------------------------------------- skip rows

export type SkipAction = "reserve_unchanged" | "swap_same_pattern";

/** Skipped once → re-serve unchanged, no penalty. Twice → swap for a
    same-pattern alternative. Swapping resets the count. */
export function skipDecision(consecutiveSkips: number): SkipAction {
  return consecutiveSkips >= 2 ? "swap_same_pattern" : "reserve_unchanged";
}

// ---------------------------------------------------------------- pain rows

export const PAIN_SUPPRESSION_DAYS = 7;
/** Re-introduce at −20%, not at the pre-pain load. */
export const PAIN_RELEASE_MULTIPLIER = 0.8;

export function painSuppressionActive(event: PainEvent, todayISO: string): boolean {
  const elapsed = daysBetween(event.date, todayISO);
  return elapsed >= 0 && elapsed < PAIN_SUPPRESSION_DAYS;
}

/** User constraints + unexpired pain suppressions = what the planner sees.
    Pain never overwrites the user's own settings — it only adds. */
export function effectiveConstraints(
  base: Constraints,
  painEvents: PainEvent[],
  todayISO: string,
): Constraints {
  const regions = { ...base.regions };
  for (const event of painEvents) {
    if (painSuppressionActive(event, todayISO)) {
      regions[event.region] = "suppressed";
    } else if (
      daysBetween(event.date, todayISO) < PAIN_SUPPRESSION_DAYS + 7 &&
      regions[event.region] === "clear"
    ) {
      // The week after release: ease back in rather than snapping to full.
      regions[event.region] = "easing";
    }
  }
  return { ...base, regions };
}

// ------------------------------------------------------------- weekly rows

export interface WeekSummary {
  week: number;
  sessions: number; // non-rest logs
  medianRpe: number | null;
}

export function summarizeWeeks(logs: SessionLog[], todayISO: string, count: number): WeekSummary[] {
  const current = weekIndex(todayISO);
  const out: WeekSummary[] = [];
  for (let w = current - count; w < current; w++) {
    const inWeek = logs.filter(
      (l) => weekIndex(l.date) === w && l.tier !== "rest",
    );
    out.push({
      week: w,
      sessions: inWeek.length,
      medianRpe: median(inWeek.map((l) => l.rpe).filter((r): r is number => r != null)),
    });
  }
  return out;
}

/** A good week: ≥3 logged sessions (any tier — Minimum counts fully) with
    median RPE ≤ 8. Until planned weeks exist (step 5) the session count
    stands in for "80% of non-rest days". */
export function isGoodWeek(w: WeekSummary): boolean {
  return w.sessions >= 3 && (w.medianRpe === null || w.medianRpe <= 8);
}

/** 3 consecutive good weeks → insert a deload week automatically. */
export function deloadDue(lastThreeWeeks: WeekSummary[]): boolean {
  return lastThreeWeeks.length === 3 && lastThreeWeeks.every(isGoodWeek);
}

export const DELOAD_MULTIPLIER = 0.6;

// ----------------------------------------------------------------- gap row

export const GAP_DAYS = 10;
export const GAP_RETURN_MULTIPLIER = 0.7;

/** 10+ days inactive → return at 70% of previous loads. No commentary about
    the gap — the copy layer says "welcome back", never "you disappeared". */
export function gapMultiplier(lastLogISO: string | null, todayISO: string): number {
  if (!lastLogISO) return 1;
  return daysBetween(lastLogISO, todayISO) >= GAP_DAYS ? GAP_RETURN_MULTIPLIER : 1;
}

// ------------------------------------------------------------------ streak

/**
 * The honest streak: consecutive weeks with ≥1 logged action (any tier,
 * rest included — rest is a choice, and it counts). The current week counts
 * as alive even before its first log as long as last week had one.
 */
export function weeklyStreak(logs: SessionLog[], todayISO: string): number {
  if (logs.length === 0) return 0;
  const weeksWithLogs = new Set(logs.map((l) => weekIndex(l.date)));
  const current = weekIndex(todayISO);
  let streak = 0;
  let w = weeksWithLogs.has(current) ? current : current - 1;
  while (weeksWithLogs.has(w)) {
    streak++;
    w--;
  }
  return streak;
}

// --------------------------------------------------------- day-level signal

export interface DaySignals {
  /** Global load multiplier for today (gap return × deload). */
  multiplier: number;
  gapReturn: boolean;
  deload: boolean;
  streakWeeks: number;
  sessionsThisWeek: number;
}

export function daySignals(logs: SessionLog[], todayISO: string): DaySignals {
  const nonRest = logs.filter((l) => l.tier !== "rest");
  const last = nonRest[nonRest.length - 1]?.date ?? null;
  const gap = gapMultiplier(last, todayISO);
  const deload = deloadDue(summarizeWeeks(logs, todayISO, 3));
  return {
    multiplier: Math.min(gap, deload ? DELOAD_MULTIPLIER : 1),
    gapReturn: gap < 1,
    deload,
    streakWeeks: weeklyStreak(logs, todayISO),
    sessionsThisWeek: logs.filter(
      (l) => weekIndex(l.date) === weekIndex(todayISO) && l.tier !== "rest",
    ).length,
  };
}
