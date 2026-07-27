import { describe, expect, it } from "vitest";
import { defaultConstraints } from "./constraints";
import { applyExtraction, type ExtractedRegion } from "./extraction";

const region = (over: Partial<ExtractedRegion>): ExtractedRegion => ({
  region: "knee",
  side: null,
  severity: "moderate",
  source: "test",
  confidence: 0.9,
  low_confidence: false,
  suggested_state: "easing",
  ...over,
});

describe("applying extracted findings", () => {
  it("tightens region states from accepted findings", () => {
    const c = applyExtraction(defaultConstraints(), {
      regions: [
        region({ region: "lumbar", suggested_state: "suppressed" }),
        region({ region: "knee", suggested_state: "easing" }),
      ],
      patterns: ["axial_loading"],
      romLimits: [],
      impactCeiling: "low",
    });
    expect(c.regions.lumbar).toBe("suppressed");
    expect(c.regions.knee).toBe("easing");
    expect(c.avoidPatterns).toContain("axial_loading");
    expect(c.maxImpact).toBe("low");
  });

  it("is restriction-only: never loosens what the user already set", () => {
    const base = defaultConstraints();
    base.regions.knee = "suppressed"; // user's own stricter setting
    base.maxImpact = "none";
    base.avoidPatterns = ["overhead_pressing"];
    const c = applyExtraction(base, {
      regions: [region({ region: "knee", suggested_state: "easing" })],
      patterns: ["axial_loading"],
      romLimits: [],
      impactCeiling: "moderate", // looser than the user's "none"
    });
    expect(c.regions.knee).toBe("suppressed"); // not downgraded
    expect(c.maxImpact).toBe("none"); // not raised
    expect(c.avoidPatterns).toEqual(
      expect.arrayContaining(["overhead_pressing", "axial_loading"]),
    );
  });

  it("maps ROM degrees to the app's coarse levels, restrictively", () => {
    const c = applyExtraction(defaultConstraints(), {
      regions: [],
      patterns: [],
      romLimits: [
        { joint: "knee", motion: "flexion", max_deg: 110 }, // > limited cap → limited... check
        { joint: "shoulder", motion: "flexion", max_deg: 85 }, // ≤ very_limited (90)
      ],
      impactCeiling: null,
    });
    // knee caps: limited=100, very=70. 110 > 100 → stays full (the doc allows
    // more range than "limited" removes — restricting further would be wrong).
    expect(c.romLimits.knee ?? "full").toBe("full");
    expect(c.romLimits.shoulder).toBe("very_limited");
  });

  it("ignores joints outside the coarse-ROM set instead of guessing", () => {
    const c = applyExtraction(defaultConstraints(), {
      regions: [],
      patterns: [],
      romLimits: [{ joint: "wrist", motion: "flexion", max_deg: 30 }],
      impactCeiling: null,
    });
    expect(c.romLimits.wrist).toBeUndefined();
  });

  it("deduplicates avoid patterns", () => {
    const base = defaultConstraints();
    base.avoidPatterns = ["axial_loading"];
    const c = applyExtraction(base, {
      regions: [],
      patterns: ["axial_loading", "high_impact"],
      romLimits: [],
      impactCeiling: null,
    });
    expect(c.avoidPatterns.filter((p) => p === "axial_loading")).toHaveLength(1);
    expect(c.avoidPatterns).toContain("high_impact");
  });
});
