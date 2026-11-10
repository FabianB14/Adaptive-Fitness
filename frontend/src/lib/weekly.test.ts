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

describe("weights-only and mobility-only choices", () => {
  const prefs = trainingPreferences({
    days: 5,
    weekdays: [0, 1, 2, 3, 4],
    minutes: 30,
    experience: "regular",
    style: "strength",
    locations: { 0: "gym", 1: "gym", 2: "gym", 3: "home", 4: "home" },
    locationEquipment: { gym: ["machine", "dumbbell"], home: ["bodyweight"] },
    locationWorkoutTypes: { gym: "weights", home: "mobility" },
  });
  const p = { ...profile, training: prefs };
  const tiers = ["full", "light", "minimum"] as const;
  it("keeps every tier weight-based on consecutive gym days and reduces recovery volume", () => {
    const days = generateWeek(defaultConstraints(), "2026-11-10", p).days;
    for (const day of days.slice(0, 3)) {
      expect(day.title).toContain("weights");
      for (const tier of tiers) {
        expect(day.plan[tier].length).toBeGreaterThan(0);
        for (const item of day.plan[tier]) {
          expect(["machine", "dumbbell"]).toContain(item.exercise.equipment);
          expect(["mobility", "gait"]).not.toContain(
            item.exercise.movement_pattern,
          );
        }
      }
    }
    expect(days[0].plan.full.some((item) => item.sets === 3)).toBe(true);
    expect(days[1].plan.full.every((item) => item.sets <= 2)).toBe(true);
    expect(
      days[1].plan.notes.some((note) => note.includes("lighter weights day")),
    ).toBe(true);
    for (const day of days.slice(3, 5))
      for (const tier of tiers) {
        expect(day.plan[tier].length).toBeGreaterThan(0);
        expect(
          day.plan[tier].every(
            (item) => item.exercise.movement_pattern === "mobility",
          ),
        ).toBe(true);
      }
  });

  it("honors explicit weights even with flexibility goals and a mobility template", () => {
    const week = generateWeek(defaultConstraints(), "2026-11-10", {
      ...p,
      goals: ["flexibility", "endurance"],
      training: { ...prefs, style: "mobility" },
    });
    for (const day of week.days.filter((day) => day.location === "gym"))
      for (const tier of tiers) {
        expect(day.plan[tier].length).toBeGreaterThan(0);
        expect(
          day.plan[tier].every((item) =>
            ["dumbbell", "machine"].includes(item.exercise.equipment),
          ),
        ).toBe(true);
      }
  });

  it("reduces recovery-day work even with a ten-minute time budget", () => {
    for (const minutes of [10, 20, 30, 45]) {
      const days = generateWeek(defaultConstraints(), "2026-11-10", {
        ...p,
        training: { ...prefs, minutes },
      }).days;
      const sets = (day: (typeof days)[number]) =>
        day.plan.full.reduce((n, item) => n + item.sets, 0);
      expect(sets(days[1])).toBeGreaterThan(0);
      expect(sets(days[1])).toBeLessThan(sets(days[0]));
    }
  });

  it("prioritizes a date switch over weekdays and location without changing the following week", () => {
    const c = defaultConstraints();
    const withWeekday = {
      ...p,
      training: { ...prefs, workoutTypes: { 1: "mobility" as const } },
    };
    expect(generateWeek(c, "2026-11-10", withWeekday).days[1].workoutType).toBe(
      "mobility",
    );
    const switched = {
      ...withWeekday,
      training: {
        ...withWeekday.training,
        workoutOverrides: { "2026-11-10": "weights" as const },
      },
    };
    const day = generateWeek(c, "2026-11-10", switched).days[1];
    expect(day.workoutType).toBe("weights");
    expect(day.plan.full.length).toBeGreaterThan(0);
    expect(generateWeek(c, "2026-11-17", switched).days[1].workoutType).toBe(
      "mobility",
    );
    expect(planForDate(c, day.date, switched)).toEqual(day.plan);
    const reset = {
      ...switched,
      training: {
        ...switched.training,
        workoutOverrides: { "2026-11-10": "auto" as const },
      },
    };
    expect(generateWeek(c, "2026-11-10", reset).days[1].workoutType).toBe(
      "mobility",
    );
    const changedLocation = {
      ...p,
      training: {
        ...prefs,
        locationOverrides: { "2026-11-10": "home" as const },
      },
    };
    expect(
      generateWeek(c, "2026-11-10", changedLocation).days[1].workoutType,
    ).toBe("mobility");
  });

  it("does not fill a weight day with mobility when only bodyweight or bands are available", () => {
    const c = { ...defaultConstraints(), equipment: ["bodyweight", "band"] };
    const day = generateWeek(c, "2026-11-10", {
      ...p,
      training: {
        ...prefs,
        locationEquipment: undefined,
        workoutTypes: { 1: "weights" },
      },
    }).days[1];
    for (const tier of tiers) expect(day.plan[tier]).toEqual([]);
    expect(day.guidance).toContain("No weight exercises");
    expect(day.plan.notes.some((note) => note.includes("equipment"))).toBe(
      true,
    );
  });

  it("retains pain, chair, impact, range-of-motion, and avoided-pattern restrictions", () => {
    const c = {
      ...defaultConstraints(),
      equipment: ["machine", "dumbbell"],
      chairMode: true,
      maxImpact: "low",
      avoidPatterns: ["axial_loading"],
    };
    c.romLimits.shoulder = "limited";
    const week = generateWeek(c, "2026-11-10", p, new Set(), [
      { id: "pain", date: "2026-11-09", region: "knee" },
    ]);
    const safe = {
      ...c,
      regions: { ...c.regions, knee: "suppressed" as const },
    };
    const gymItems = week.days
      .filter((d) => d.location === "gym")
      .flatMap((d) => tiers.flatMap((tier) => d.plan[tier]));
    expect(gymItems.length).toBeGreaterThan(0);
    for (const item of gymItems) {
      expect(allowedByConstraints(item.exercise, safe)).toBe(true);
      expect(item.exercise.joints_loaded).not.toContain("knee");
    }
  });

  it("uses gentler weighted variants and lower volume for beginners", () => {
    const day = generateWeek(defaultConstraints(), "2026-11-10", {
      ...p,
      training: { ...prefs, experience: "new" },
    }).days[1];
    for (const tier of tiers) {
      expect(day.plan[tier].length).toBeGreaterThan(0);
      for (const item of day.plan[tier]) {
        expect(item.exercise.intensity_tier).not.toBe("full");
        expect(item.sets).toBeLessThanOrEqual(2);
        expect(["machine", "dumbbell"]).toContain(item.exercise.equipment);
      }
    }
  });

  it("ignores invalid saved workout choices", () => {
    const loaded = trainingPreferences(
      JSON.parse(
        JSON.stringify({
          ...prefs,
          workoutTypes: { 1: "weights", 9: "mobility", 2: "unknown" },
          locationWorkoutTypes: {
            gym: "weights",
            home: "invalid",
            anywhere: "mobility",
          },
          workoutOverrides: {
            "2026-11-10": "mobility",
            invalid: "weights",
            "2026-11-11": "invalid",
          },
        }),
      ),
    );
    expect(loaded.workoutTypes).toEqual({ 1: "weights" });
    expect(loaded.locationWorkoutTypes).toEqual({ gym: "weights" });
    expect(loaded.workoutOverrides).toEqual({ "2026-11-10": "mobility" });
  });

  it("does not treat Sunday's mobility as a weight workout before Monday", () => {
    const day = generateWeek(defaultConstraints(), "2026-11-10", {
      ...p,
      training: {
        ...prefs,
        days: 2,
        weekdays: [0, 6],
        locations: { 0: "gym", 6: "home" },
      },
    }).days[0];
    expect(day.plan.full.some((item) => item.sets === 3)).toBe(true);
    expect(day.title).not.toContain("lighter");
  });
});
