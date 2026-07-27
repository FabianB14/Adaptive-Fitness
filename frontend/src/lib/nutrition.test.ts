import { describe, expect, it } from "vitest";
import {
  calorieTarget,
  KCAL_FLOOR,
  mifflinStJeor,
  totalKcal,
  type Profile,
} from "./nutrition";

const profile = (over: Partial<Profile>): Profile => ({
  version: 1,
  sex: "male",
  birthYear: 1996,
  heightCm: 180,
  weightKg: 80,
  activity: "moderate",
  ...over,
});

describe("Mifflin-St Jeor", () => {
  it("matches known values", () => {
    expect(mifflinStJeor("male", 80, 180, 30)).toBe(1780);
    expect(mifflinStJeor("female", 80, 180, 30)).toBe(1614);
  });
});

describe("calorie target", () => {
  it("applies activity then the steady-pace deficit by default", () => {
    const t = calorieTarget(profile({}), 2026)!;
    // BMR 1780 × 1.55 = 2759; steady deficit min(400, 12%·2759=331.08)
    expect(t.tdee).toBe(2759);
    expect(t.kcal).toBe(2428);
    expect(t.floorApplied).toBe(false);
  });

  it("pace changes the deficit: gentle < steady < aggressive", () => {
    const gentle = calorieTarget(profile({ pace: "gentle" }), 2026)!;
    const steady = calorieTarget(profile({ pace: "steady" }), 2026)!;
    const aggressive = calorieTarget(profile({ pace: "aggressive" }), 2026)!;
    expect(gentle.kcal).toBeGreaterThan(steady.kcal);
    expect(steady.kcal).toBeGreaterThan(aggressive.kcal);
  });

  it("caps even the aggressive deficit at 500 kcal for high TDEEs", () => {
    const t = calorieTarget(
      profile({ weightKg: 110, activity: "high", pace: "aggressive" }),
      2026,
    )!;
    expect(t.tdee - t.kcal).toBeLessThanOrEqual(500);
  });

  it("NEVER goes below the hard floor, at any pace", () => {
    for (const pace of ["gentle", "steady", "aggressive"] as const) {
      const t = calorieTarget(
        profile({ sex: "female", weightKg: 45, heightCm: 150, birthYear: 1956, activity: "sedentary", pace }),
        2026,
      )!;
      expect(t.kcal).toBe(KCAL_FLOOR.female);
      expect(t.floorApplied).toBe(true);
    }
  });

  it("floor holds even for absurd inputs", () => {
    const t = calorieTarget(profile({ sex: "male", weightKg: 40, heightCm: 140, birthYear: 1940 }), 2026)!;
    expect(t.kcal).toBeGreaterThanOrEqual(KCAL_FLOOR.male);
  });

  it("no weight on file → no target, and that's a supported state", () => {
    expect(calorieTarget(profile({ weightKg: null }), 2026)).toBeNull();
  });
});

describe("diary math", () => {
  it("totals entries", () => {
    expect(
      totalKcal([
        { id: "1", date: "d", meal: "breakfast", label: "", kcal: 300 },
        { id: "2", date: "d", meal: "lunch", label: "", kcal: 550 },
      ]),
    ).toBe(850);
  });
});
