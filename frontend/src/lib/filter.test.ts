import { describe, expect, it } from "vitest";
import { defaultConstraints } from "./constraints";
import { allowedByConstraints, filterPool, loadsEasingRegion } from "./filter";
import { exercises } from "./library";

const bySlug = (slug: string) => {
  const e = exercises.find((x) => x.slug === slug);
  if (!e) throw new Error(`missing seed exercise ${slug}`);
  return e;
};

describe("constraint filter", () => {
  it("passes everything under default (clear) constraints except high impact", () => {
    const c = defaultConstraints(); // maxImpact: moderate
    const kept = filterPool(exercises, c);
    const nonHigh = exercises.filter((e) => e.impact_level !== "high");
    expect(kept.length).toBe(nonHigh.length);
    expect(kept.some((e) => e.slug === "steady-run")).toBe(false); // high impact
    expect(kept.some((e) => e.slug === "easy-jog")).toBe(true); // moderate
  });

  it("suppressed region drops every exercise loading it", () => {
    const c = defaultConstraints();
    c.regions.lumbar = "suppressed";
    const kept = filterPool(exercises, c);
    expect(kept.length).toBeGreaterThan(0);
    for (const e of kept) expect(e.joints_loaded).not.toContain("lumbar");
    expect(kept.some((e) => e.slug === "romanian-deadlift-dumbbell")).toBe(false);
  });

  it("easing region keeps exercises but marks them", () => {
    const c = defaultConstraints();
    c.regions.knee = "easing";
    expect(allowedByConstraints(bySlug("goblet-squat"), c)).toBe(true);
    expect(loadsEasingRegion(bySlug("goblet-squat"), c)).toBe(true);
    expect(loadsEasingRegion(bySlug("wall-push-up"), c)).toBe(false);
  });

  it("avoiding axial loading excludes axial_load exercises", () => {
    const c = defaultConstraints();
    c.avoidPatterns = ["axial_loading"];
    const kept = filterPool(exercises, c);
    for (const e of kept) expect(e.axial_load).toBe(false);
  });

  it("avoiding overhead pressing removes flagged exercises but keeps landmine substitutes", () => {
    const c = defaultConstraints();
    c.avoidPatterns = ["overhead_pressing"];
    const kept = filterPool(exercises, c);
    expect(kept.some((e) => e.slug === "seated-dumbbell-shoulder-press")).toBe(false);
    expect(kept.some((e) => e.slug === "half-kneeling-landmine-press")).toBe(true);
  });

  it("impact ceiling is enforced", () => {
    const c = defaultConstraints();
    c.maxImpact = "none";
    const kept = filterPool(exercises, c);
    for (const e of kept) expect(e.impact_level).toBe("none");
  });

  it("equipment filter keeps bodyweight-none exercises available", () => {
    const c = defaultConstraints();
    c.equipment = ["bodyweight"]; // nothing else owned
    const kept = filterPool(exercises, c);
    expect(kept.length).toBeGreaterThan(20);
    for (const e of kept) expect(["none", "bodyweight"]).toContain(e.equipment);
  });

  it("chair mode keeps only chair-friendly exercises", () => {
    const c = defaultConstraints();
    c.chairMode = true;
    const kept = filterPool(exercises, c);
    expect(kept.length).toBeGreaterThan(20);
    for (const e of kept) expect(e.wheelchair_ok).toBe(true);
  });

  it("ROM limits are restrictive: limited knee excludes deep-flexion demands", () => {
    const c = defaultConstraints();
    c.romLimits.knee = "limited"; // cap 100°
    const kept = filterPool(exercises, c);
    expect(kept.some((e) => e.slug === "childs-pose-rock")).toBe(false); // needs 130°
    expect(kept.some((e) => e.slug === "wall-sit")).toBe(true); // needs 90°
    for (const e of kept) expect(e.rom_demand.knee ?? 0).toBeLessThanOrEqual(100);
  });
});
