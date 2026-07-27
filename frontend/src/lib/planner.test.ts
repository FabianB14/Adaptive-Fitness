import { describe, expect, it } from "vitest";
import { defaultConstraints } from "./constraints";
import { generatePlan } from "./planner";

const DATE = "2026-07-27";

describe("plan generator", () => {
  it("is deterministic: same date + same constraints = same plan", () => {
    const c = defaultConstraints();
    const a = generatePlan(c, DATE);
    const b = generatePlan(c, DATE);
    expect(a.full.map((i) => i.exercise.slug)).toEqual(
      b.full.map((i) => i.exercise.slug),
    );
    expect(a.light.map((i) => i.exercise.slug)).toEqual(
      b.light.map((i) => i.exercise.slug),
    );
    expect(a.minimum.map((i) => i.exercise.slug)).toEqual(
      b.minimum.map((i) => i.exercise.slug),
    );
  });

  it("varies across days", () => {
    const c = defaultConstraints();
    const days = ["2026-07-27", "2026-07-28", "2026-07-29", "2026-07-30"];
    const signatures = days.map((d) =>
      generatePlan(c, d)
        .full.map((i) => i.exercise.slug)
        .join("|"),
    );
    expect(new Set(signatures).size).toBeGreaterThan(1);
  });

  it("fills all three tiers under default constraints", () => {
    const plan = generatePlan(defaultConstraints(), DATE);
    expect(plan.full.length).toBeGreaterThanOrEqual(5);
    expect(plan.light.length).toBeGreaterThanOrEqual(3);
    expect(plan.minimum.length).toBeGreaterThanOrEqual(2);
  });

  it("never repeats an exercise within a tier", () => {
    const plan = generatePlan(defaultConstraints(), DATE);
    for (const tier of [plan.full, plan.light, plan.minimum]) {
      const slugs = tier.map((i) => i.exercise.slug);
      expect(new Set(slugs).size).toBe(slugs.length);
    }
  });

  it("respects suppressed regions in every tier and says so", () => {
    const c = defaultConstraints();
    c.regions.lumbar = "suppressed";
    const plan = generatePlan(c, DATE);
    for (const tier of [plan.full, plan.light, plan.minimum]) {
      for (const item of tier) {
        expect(item.exercise.joints_loaded).not.toContain("lumbar");
      }
    }
    expect(plan.notes.some((n) => n.toLowerCase().includes("lower back"))).toBe(true);
  });

  it("softens rather than fails when constraints stack: chair mode + no equipment still yields a day", () => {
    const c = defaultConstraints();
    c.chairMode = true;
    c.equipment = [];
    c.maxImpact = "none";
    const plan = generatePlan(c, DATE);
    // Some slots may close; the day must never come back empty.
    expect(
      plan.full.length + plan.light.length + plan.minimum.length,
    ).toBeGreaterThan(0);
    for (const tier of [plan.full, plan.light, plan.minimum]) {
      for (const item of tier) expect(item.exercise.wheelchair_ok).toBe(true);
    }
  });

  it("marks items that touch easing regions instead of dropping them silently", () => {
    const c = defaultConstraints();
    for (const region of Object.keys(c.regions)) c.regions[region] = "easing";
    const plan = generatePlan(c, DATE);
    const items = [...plan.full, ...plan.light, ...plan.minimum];
    expect(items.length).toBeGreaterThan(0);
    const touching = items.filter((i) => i.exercise.joints_loaded.length > 0);
    for (const item of touching) expect(item.note).toBeTruthy();
  });

  it("minimum tier stays truly minimal: only minimum-intensity exercises", () => {
    const plan = generatePlan(defaultConstraints(), DATE);
    for (const item of plan.minimum) {
      expect(item.exercise.intensity_tier).toBe("minimum");
    }
  });
});
