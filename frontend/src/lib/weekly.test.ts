import { describe, expect, it } from "vitest";
import { defaultConstraints } from "./constraints";
import { allowedByConstraints } from "./filter";
import { type Profile } from "./nutrition";
import {
  addDays,
  generateWeek,
  mondayOf,
  PLAN_STYLES,
  planForDate,
  trainingPreferences,
} from "./weekly";
const profile: Profile = {
  version: 1,
  sex: "female",
  birthYear: 1990,
  heightCm: 168,
  weightKg: null,
  activity: "light",
  goals: ["strength"],
  pace: "steady",
  training: trainingPreferences(),
};
describe("weekly plans", () => {
  it("uses local Monday boundaries through month and year changes", () => {
    expect(mondayOf("2027-01-03")).toBe("2026-12-28");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-08", 1)).toBe("2026-03-09");
  });
  it("honors chosen weekdays and rest days for every available frequency", () => {
    for (let days = 1; days <= 6; days++) {
      const p = { ...profile, training: trainingPreferences({ days }) };
      const week = generateWeek(defaultConstraints(), "2026-11-10", p);
      expect(week.days.filter((d) => !d.rest)).toHaveLength(days);
      week.days.forEach((d, i) =>
        expect(d.rest).toBe(!p.training.weekdays.includes(i)),
      );
      expect(
        week.days.filter((d) => !d.rest && d.title !== "Gentle mobility")
          .length,
      ).toBeLessThanOrEqual(3);
    }
  });
  it("alternates effort and recovery on consecutive training days", () => {
    const p = {
      ...profile,
      training: trainingPreferences({
        days: 4,
        weekdays: [0, 1, 2, 3],
        style: "strength",
      }),
    };
    const days = generateWeek(defaultConstraints(), "2026-11-10", p).days;
    expect(days.slice(0, 4).map((d) => d.title === "Gentle mobility")).toEqual([
      false,
      true,
      false,
      true,
    ]);
  });
  it("starts beginners with easier exercise variants", () => {
    const week = generateWeek(defaultConstraints(), "2026-11-10", profile);
    const work = week.days.flatMap((d) => d.plan.full);
    expect(work.length).toBeGreaterThan(0);
    work.forEach((item) =>
      expect(item.exercise.intensity_tier).not.toBe("full"),
    );
  });
  it("normalizes duplicate and invalid stored weekdays", () => {
    expect(
      trainingPreferences({ days: 3, weekdays: [0, 0, 9] }).weekdays,
    ).toEqual([0, 2, 4]);
    expect(trainingPreferences({ days: NaN, minutes: -10 }).minutes).toBe(20);
  });
  it("keeps every template and every tier inside body, equipment, and impact limits", () => {
    const c = {
      ...defaultConstraints(),
      equipment: ["bodyweight"],
      maxImpact: "low",
      chairMode: true,
    };
    c.regions.knee = "suppressed";
    c.romLimits.shoulder = "limited";
    for (const style of PLAN_STYLES) {
      const week = generateWeek(c, "2026-11-10", {
        ...profile,
        training: trainingPreferences({ style: style.id }),
      });
      for (const d of week.days)
        for (const tier of ["full", "light", "minimum"] as const) {
          for (const item of d.plan[tier])
            expect(allowedByConstraints(item.exercise, c)).toBe(true);
        }
    }
  });
  it("uses exactly the previewed plan for the session on each date", () => {
    const c = defaultConstraints();
    const avoid = new Set(["bodyweight-squat"]);
    const week = generateWeek(c, "2026-11-10", profile, avoid);
    for (const d of week.days)
      expect(planForDate(c, d.date, profile, avoid)).toEqual(d.plan);
  });
  it("does not invent exercises when restrictions exclude the pool", () => {
    const c = defaultConstraints();
    for (const key of Object.keys(c.regions)) c.regions[key] = "suppressed";
    c.equipment = [];
    const week = generateWeek(c, "2026-11-10", profile);
    for (const day of week.days)
      for (const item of day.plan.full)
        expect(allowedByConstraints(item.exercise, c)).toBe(true);
  });
  it("fits strength doses within the time budget and lowers beginner volume", () => {
    for (const minutes of [10, 20, 30, 45]) {
      const week = generateWeek(defaultConstraints(), "2026-11-10", {
        ...profile,
        training: trainingPreferences({ minutes }),
      });
      for (const day of week.days) {
        const duration = day.plan.full.reduce(
          (total, item) =>
            total +
            (item.dose.includes("min")
              ? Number(item.dose.split(" ")[0])
              : item.sets * 2),
          2,
        );
        expect(duration).toBeLessThanOrEqual(minutes);
        day.plan.full.forEach((item) =>
          expect(item.sets).toBeLessThanOrEqual(2),
        );
      }
    }
  });
  it("updates training choices after a pain report", () => {
    const week = generateWeek(
      defaultConstraints(),
      "2026-11-10",
      profile,
      new Set(),
      [{ id: "pain-1", date: "2026-11-09", region: "knee" }],
    );
    for (const day of week.days)
      for (const tier of ["full", "light", "minimum"] as const) {
        for (const item of day.plan[tier])
          expect(item.exercise.joints_loaded).not.toContain("knee");
      }
  });
});

describe("gym and home schedules", () => {
  const training = trainingPreferences({
    days: 5,
    weekdays: [0, 1, 2, 3, 4],
    style: "strength",
    experience: "regular",
    locations: { 0: "gym", 1: "home", 2: "gym", 3: "home", 4: "gym" },
    locationEquipment: { home: ["bodyweight"], gym: ["machine", "dumbbell"] },
  });
  const p = { ...profile, training };
  it("uses the correct equipment at each of three gym and two home sessions", () => {
    const c = defaultConstraints();
    c.equipment = ["bodyweight"];
    c.regions.knee = "suppressed";
    const week = generateWeek(c, "2026-11-10", p);
    expect(week.days.filter((d) => d.location === "gym")).toHaveLength(3);
    expect(week.days.filter((d) => d.location === "home")).toHaveLength(2);
    for (const day of week.days)
      for (const tier of ["full", "light", "minimum"] as const)
        for (const item of day.plan[tier]) {
          const equipment = training.locationEquipment![day.location!];
          expect(
            item.exercise.equipment === "none" ||
              equipment.includes(item.exercise.equipment),
          ).toBe(true);
          expect(item.exercise.joints_loaded).not.toContain("knee");
        }
  });
  it("allows a one-date switch while preserving the usual weekday location", () => {
    const switched = {
      ...p,
      training: trainingPreferences({
        ...training,
        locationOverrides: { "2026-11-11": "home" },
      }),
    };
    expect(
      generateWeek(defaultConstraints(), "2026-11-10", switched).days[2]
        .location,
    ).toBe("home");
    expect(
      generateWeek(defaultConstraints(), "2026-11-17", switched).days[2]
        .location,
    ).toBe("gym");
    const day = generateWeek(defaultConstraints(), "2026-11-10", switched)
      .days[2];
    expect(planForDate(defaultConstraints(), day.date, switched)).toEqual(
      day.plan,
    );
  });
  it("keeps older profiles on their existing equipment list until locations are enabled", () => {
    const c = defaultConstraints();
    c.equipment = ["band"];
    const week = generateWeek(c, "2026-11-10", profile);
    expect(week.days.every((d) => d.location === undefined)).toBe(true);
    for (const day of week.days)
      for (const item of day.plan.full)
        expect(["none", "band"]).toContain(item.exercise.equipment);
  });
});
