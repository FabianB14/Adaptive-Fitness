/**
 * One test block per row of the adaptation rules table (with the amendments
 * documented in docs/ARCHITECTURE.md). The rules ARE the product; these
 * tests are the contract.
 */
import { describe, expect, it } from "vitest";
import { defaultConstraints } from "./constraints";
import {
  capWeeklyIncrease,
  daySignals,
  deloadDue,
  effectiveConstraints,
  gapMultiplier,
  isGoodWeek,
  painSuppressionActive,
  progressionDecision,
  skipDecision,
  summarizeWeeks,
  weeklyStreak,
  type WeekSummary,
} from "./engine";
import { type PainEvent, type SessionLog } from "./logs";

const log = (date: string, tier: SessionLog["tier"], rpe?: number): SessionLog => ({
  id: date,
  date,
  tier,
  rpe,
  loggedAt: date,
});

const week = (sessions: number, medianRpe: number | null): WeekSummary => ({
  week: 0,
  sessions,
  medianRpe,
});

describe("row: completed, RPE ≤ 7 → progress next session", () => {
  it("progresses on RPE 7 and below", () => {
    expect(progressionDecision([7])).toEqual({ kind: "progress", pct: 2.5 });
    expect(progressionDecision([5])).toEqual({ kind: "progress", pct: 2.5 });
  });
});

describe("row: completed, RPE 8 → hold", () => {
  it("holds", () => {
    expect(progressionDecision([8])).toEqual({ kind: "hold" });
  });
});

describe("row: completed, RPE 9–10 → reduce 10% (amended)", () => {
  it("RPE 9 once holds and watches instead of punishing one bad day", () => {
    expect(progressionDecision([7, 9])).toEqual({ kind: "hold" });
  });
  it("RPE 9 twice consecutively reduces 10%", () => {
    expect(progressionDecision([9, 9])).toEqual({ kind: "reduce", pct: 10 });
  });
  it("RPE 10 once reduces 10% immediately", () => {
    expect(progressionDecision([10])).toEqual({ kind: "reduce", pct: 10 });
  });
  it("regression floor: after 2 consecutive reductions, swap easier instead", () => {
    expect(progressionDecision([9, 9, 9], 2)).toEqual({ kind: "swap_easier" });
  });
  it("no data means no change", () => {
    expect(progressionDecision([])).toEqual({ kind: "hold" });
  });
});

describe("row: skipped once → re-serve unchanged, no penalty", () => {
  it("re-serves", () => {
    expect(skipDecision(1)).toBe("reserve_unchanged");
  });
});

describe("row: skipped twice → swap same-pattern alternative", () => {
  it("swaps at two consecutive skips", () => {
    expect(skipDecision(2)).toBe("swap_same_pattern");
    expect(skipDecision(3)).toBe("swap_same_pattern");
  });
});

describe("row: pain logged → suppress region 7 days, then ease back", () => {
  const event: PainEvent = { id: "p", date: "2026-07-20", region: "knee" };

  it("suppression is active for exactly 7 days", () => {
    expect(painSuppressionActive(event, "2026-07-20")).toBe(true);
    expect(painSuppressionActive(event, "2026-07-26")).toBe(true);
    expect(painSuppressionActive(event, "2026-07-27")).toBe(false);
  });

  it("effective constraints suppress the region while active", () => {
    const c = effectiveConstraints(defaultConstraints(), [event], "2026-07-22");
    expect(c.regions.knee).toBe("suppressed");
  });

  it("after release the region eases back in rather than snapping to clear", () => {
    const c = effectiveConstraints(defaultConstraints(), [event], "2026-07-28");
    expect(c.regions.knee).toBe("easing");
  });

  it("pain never downgrades a user's own stricter setting", () => {
    const base = defaultConstraints();
    base.regions.knee = "suppressed"; // user's own choice
    const c = effectiveConstraints(base, [event], "2026-08-15");
    expect(c.regions.knee).toBe("suppressed");
  });
});

describe("row: 3 consecutive good weeks → deload", () => {
  it("defines a good week as ≥3 sessions with median RPE ≤ 8", () => {
    expect(isGoodWeek(week(3, 7))).toBe(true);
    expect(isGoodWeek(week(2, 6))).toBe(false);
    expect(isGoodWeek(week(4, 8.5))).toBe(false);
    expect(isGoodWeek(week(3, null))).toBe(true); // RPE unlogged doesn't disqualify
  });

  it("fires only on 3 consecutive good weeks", () => {
    expect(deloadDue([week(3, 7), week(4, 7), week(3, 8)])).toBe(true);
    expect(deloadDue([week(3, 7), week(1, 7), week(3, 7)])).toBe(false);
    expect(deloadDue([week(3, 7), week(4, 7)])).toBe(false);
  });
});

describe("row: 10+ days inactive → return at 70%", () => {
  it("applies 0.7 at ten days, not before", () => {
    expect(gapMultiplier("2026-07-17", "2026-07-27")).toBe(0.7);
    expect(gapMultiplier("2026-07-18", "2026-07-27")).toBe(1);
    expect(gapMultiplier(null, "2026-07-27")).toBe(1); // brand new: no gap talk
  });
});

describe("amendment: weekly progression cap of 5%", () => {
  it("caps stacked progressions", () => {
    expect(capWeeklyIncrease(100, 107.5)).toBe(105);
    expect(capWeeklyIncrease(100, 102.5)).toBe(102.5);
  });
});

describe("streak: consecutive weeks with ≥1 logged action", () => {
  it("rest days and minimum days keep the streak alive", () => {
    const logs = [
      log("2026-07-13", "rest"),
      log("2026-07-20", "minimum", 4),
      log("2026-07-27", "light", 6),
    ];
    expect(weeklyStreak(logs, "2026-07-27")).toBe(3);
  });

  it("the current week counts even before its first log", () => {
    const logs = [log("2026-07-20", "full", 7)];
    expect(weeklyStreak(logs, "2026-07-27")).toBe(1);
  });

  it("an empty week breaks it — the streak never lies", () => {
    const logs = [log("2026-07-06", "full", 7), log("2026-07-27", "full", 7)];
    expect(weeklyStreak(logs, "2026-07-27")).toBe(1);
  });

  it("no logs, no streak", () => {
    expect(weeklyStreak([], "2026-07-27")).toBe(0);
  });
});

describe("day signals compose with correct precedence", () => {
  it("gap return beats deload when both could apply", () => {
    // Three good weeks then a 12-day gap: the comeback matters more.
    const logs: SessionLog[] = [];
    for (const d of ["2026-06-22", "2026-06-24", "2026-06-26"]) logs.push(log(d, "full", 7));
    for (const d of ["2026-06-29", "2026-07-01", "2026-07-03"]) logs.push(log(d, "full", 7));
    for (const d of ["2026-07-06", "2026-07-08", "2026-07-10"]) logs.push(log(d, "full", 7));
    const s = daySignals(logs, "2026-07-22");
    expect(s.gapReturn).toBe(true);
    expect(s.multiplier).toBe(0.7);
  });

  it("summarizeWeeks groups sessions by Monday weeks and excludes rest", () => {
    const logs = [
      log("2026-07-20", "full", 7),
      log("2026-07-21", "rest"),
      log("2026-07-22", "light", 6),
    ];
    const weeks = summarizeWeeks(logs, "2026-07-27", 1);
    expect(weeks).toHaveLength(1);
    expect(weeks[0].sessions).toBe(2);
    expect(weeks[0].medianRpe).toBe(6.5);
  });
});
