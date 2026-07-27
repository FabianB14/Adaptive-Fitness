import { describe, expect, it } from "vitest";
import {
  clampWeightGoal,
  minHealthyWeightKg,
  progressPct,
  weekTotals,
  weeklyTargets,
  weightTrend,
} from "./metrics";
import { computeStickers } from "./rewards";

describe("weight goal safety floor", () => {
  it("computes the lightest healthy weight from height", () => {
    expect(minHealthyWeightKg(170)).toBeCloseTo(53.5, 1); // 18.5 × 1.7²
  });

  it("NEVER stores a goal below healthy BMI", () => {
    const { goalKg, floored } = clampWeightGoal(40, 170);
    expect(goalKg).toBeCloseTo(53.5, 1);
    expect(floored).toBe(true);
  });

  it("leaves healthy goals alone", () => {
    const { goalKg, floored } = clampWeightGoal(70, 170);
    expect(goalKg).toBe(70);
    expect(floored).toBe(false);
  });
});

describe("progress math", () => {
  it("works for weight loss", () => {
    expect(progressPct(100, 90, 80)).toBe(50);
  });
  it("works for gaining (goal above start)", () => {
    expect(progressPct(60, 63, 66)).toBe(50);
  });
  it("clamps to 0–100 and never punishes moving the wrong way", () => {
    expect(progressPct(100, 102, 80)).toBe(0);
    expect(progressPct(100, 75, 80)).toBe(100);
  });
  it("returns null when start equals goal", () => {
    expect(progressPct(80, 80, 80)).toBeNull();
  });
});

describe("weight trend (7-day average, not daily numbers)", () => {
  it("averages the last week's entries", () => {
    const entries = [
      { date: "2026-07-21", kg: 90 },
      { date: "2026-07-24", kg: 89 },
      { date: "2026-07-27", kg: 88 },
    ];
    expect(weightTrend(entries, "2026-07-27")).toBe(89);
  });
  it("falls back to the latest entry after a long gap", () => {
    const entries = [{ date: "2026-06-01", kg: 91 }];
    expect(weightTrend(entries, "2026-07-27")).toBe(91);
  });
  it("null with no data", () => {
    expect(weightTrend([], "2026-07-27")).toBeNull();
  });
});

describe("activity weeks", () => {
  it("totals Monday-to-today", () => {
    const activity = [
      { date: "2026-07-26", steps: 4000, cardioMin: 20 }, // Sunday — previous week
      { date: "2026-07-27", steps: 6000, cardioMin: 30 }, // Monday
    ];
    expect(weekTotals(activity, "2026-07-27")).toEqual({ steps: 6000, cardioMin: 30 });
  });
  it("targets scale with activity level and stay modest", () => {
    expect(weeklyTargets("sedentary").cardioMin).toBe(60);
    expect(weeklyTargets("high").steps).toBe(70_000);
  });
});

describe("sticker rewards", () => {
  it("earns stickers as milestones pass, in order", () => {
    const stickers = computeStickers({
      sessionCount: 6,
      streakWeeks: 2,
      totalCardioMin: 70,
      totalSteps: 120_000,
      weightPct: 55,
      measurePct: null,
    });
    const earned = stickers.filter((s) => s.earned).map((s) => s.id);
    expect(earned).toEqual(
      expect.arrayContaining(["s1", "s5", "w2", "c60", "k100", "wp25", "wp50"]),
    );
    expect(earned).not.toContain("s20");
    expect(earned).not.toContain("wp75");
  });

  it("shows at most one invitation per track — never a wall of locks", () => {
    const stickers = computeStickers({
      sessionCount: 0,
      streakWeeks: 0,
      totalCardioMin: 0,
      totalSteps: 0,
      weightPct: 0,
      measurePct: 0,
    });
    const unearnedSessions = stickers.filter((s) => s.id.startsWith("s") && !s.earned);
    expect(unearnedSessions).toHaveLength(1);
    expect(unearnedSessions[0].id).toBe("s1");
  });

  it("weight track is absent entirely when no goal is set (weight can be hidden)", () => {
    const stickers = computeStickers({
      sessionCount: 10,
      streakWeeks: 3,
      totalCardioMin: 100,
      totalSteps: 50_000,
      weightPct: null,
      measurePct: null,
    });
    expect(stickers.some((s) => s.id.startsWith("wp"))).toBe(false);
    expect(stickers.some((s) => s.id.startsWith("mp"))).toBe(false);
  });
});
