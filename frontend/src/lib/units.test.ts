import { describe, expect, it } from "vitest";
import { buildCardData, type ShareInputs } from "./share";
import {
  cmToFtIn,
  cmToIn,
  displayLength,
  displayWeight,
  formatHeight,
  ftInToCm,
  inToCm,
  kgToLb,
  lbToKg,
  parseLength,
  parseWeight,
} from "./units";

describe("US units", () => {
  it("converts weight both ways", () => {
    expect(kgToLb(100)).toBe(220.5);
    expect(lbToKg(220.5)).toBeCloseTo(100, 0);
    expect(kgToLb(72.5)).toBe(159.8);
  });

  it("converts lengths both ways", () => {
    expect(cmToIn(91.4)).toBe(36);
    expect(inToCm(36)).toBe(91.4);
  });

  it("converts height to feet and inches and back", () => {
    expect(cmToFtIn(173)).toEqual({ ft: 5, inches: 8 });
    expect(ftInToCm(5, 8)).toBe(173);
    expect(cmToFtIn(183)).toEqual({ ft: 6, inches: 0 });
    expect(formatHeight(173, "us")).toBe("5′8″");
    expect(formatHeight(173, "metric")).toBe("173 cm");
  });

  it("display helpers pass metric through untouched", () => {
    expect(displayWeight(72.5, "metric")).toBe(72.5);
    expect(displayWeight(72.5, "us")).toBe(159.8);
    expect(displayLength(80, "metric")).toBe(80);
    expect(displayLength(80, "us")).toBe(31.5);
  });

  it("parses typed input in the display unit back to canonical metric", () => {
    expect(parseWeight("160", "us")).toBe(72.6);
    expect(parseWeight("72.6", "metric")).toBe(72.6);
    expect(parseLength("32", "us")).toBe(81.3);
    expect(parseWeight("", "us")).toBeNull();
    expect(parseWeight("0", "metric")).toBeNull();
    expect(parseLength("abc", "us")).toBeNull();
  });

  it("round-trips a logged weight within a tenth", () => {
    const typedLb = 187.4;
    const kg = parseWeight(String(typedLb), "us")!;
    expect(displayWeight(kg, "us")).toBeCloseTo(typedLb, 0);
  });
});

describe("share cards are body-free by construction", () => {
  const inputs: ShareInputs = {
    streakWeeks: 3,
    sessionCount: 14,
    weekSessions: 4,
    weekCardioMin: 85,
    weekSteps: 24_000,
    stickers: [
      { id: "s5", emoji: "⭐", name: "Five sessions", earned: true },
      { id: "wp50", emoji: "🌟", name: "Halfway there", earned: true },
      { id: "s20", emoji: "🌟", name: "Twenty sessions", earned: false },
    ],
  };

  it("celebrates the streak when there is one", () => {
    const card = buildCardData(inputs, "July 27, 2026");
    expect(card.headline).toBe("3 weeks showing up");
    expect(card.stats.map((s) => s.label)).toEqual([
      "sessions this week",
      "cardio minutes",
      "steps",
    ]);
  });

  it("only earned stickers make the card", () => {
    const card = buildCardData(inputs, "July 27, 2026");
    expect(card.emojis).toEqual(["⭐", "🌟"]);
  });

  it("never mentions weight, measurements, or calories anywhere", () => {
    const card = buildCardData(inputs, "July 27, 2026");
    const text = JSON.stringify(card).toLowerCase();
    for (const banned of ["kg", "lb", " cm", "inch", "kcal", "calorie", "weight", "waist"]) {
      expect(text).not.toContain(banned);
    }
  });

  it("day one still gets a kind card", () => {
    const card = buildCardData(
      { streakWeeks: 0, sessionCount: 0, weekSessions: 0, weekCardioMin: 0, weekSteps: 0, stickers: [] },
      "July 27, 2026",
    );
    expect(card.headline).toBe("Day one");
    expect(card.subline).not.toMatch(/miss|fail|behind|guilt/i);
  });

  it("falls back to lifetime sessions when the week is quiet", () => {
    const card = buildCardData(
      { streakWeeks: 0, sessionCount: 9, weekSessions: 0, weekCardioMin: 0, weekSteps: 0, stickers: [] },
      "July 27, 2026",
    );
    expect(card.headline).toBe("9 sessions logged");
    expect(card.stats).toEqual([{ value: "9", label: "sessions so far" }]);
  });
});
