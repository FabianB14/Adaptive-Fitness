import { describe, expect, it } from "vitest";
import { defaultConstraints } from "./constraints";
import { generatePlan } from "./planner";
import {
  applySession,
  resetSwapped,
  slugsToAvoid,
  suggestion,
  type ExerciseStates,
} from "./progress";

const DATE = "2026-07-27"; // a Monday
const state = (over: Partial<ExerciseStates[string]>): ExerciseStates[string] => ({
  lastLoadKg: null,
  rpeHistory: [],
  reductions: 0,
  skips: 0,
  ...over,
});

describe("load suggestion", () => {
  it("suggests +2.5% after an easy session, rounded to 0.5 kg", () => {
    const states = { squat: state({ lastLoadKg: 40, rpeHistory: [7] }) };
    const s = suggestion("squat", states, 1, DATE);
    expect(s.loadKg).toBe(41);
    expect(s.note).toBe("+2.5%");
  });

  it("caps progression at 5% above the week-start load", () => {
    const states = {
      squat: state({
        lastLoadKg: 104, // already up 4% this week
        rpeHistory: [6],
        weekLoad: { week: 2951, loadKg: 100 }, // weekIndex(2026-07-27)
      }),
    };
    const s = suggestion("squat", states, 1, DATE);
    expect(s.loadKg).toBeLessThanOrEqual(105);
  });

  it("reduces 10% after RPE 10", () => {
    const states = { squat: state({ lastLoadKg: 40, rpeHistory: [10] }) };
    const s = suggestion("squat", states, 1, DATE);
    expect(s.loadKg).toBe(36);
    expect(s.note).toBe("easier today");
  });

  it("applies the day multiplier (70% return day)", () => {
    const states = { squat: state({ lastLoadKg: 40, rpeHistory: [8] }) };
    const s = suggestion("squat", states, 0.7, DATE);
    expect(s.loadKg).toBe(28);
  });

  it("no load history → no number, but still a decision", () => {
    const s = suggestion("new-move", {}, 1, DATE);
    expect(s.loadKg).toBeNull();
    expect(s.action.kind).toBe("hold");
  });
});

describe("applying session results", () => {
  it("a completed exercise stores load, RPE, and clears skips", () => {
    const before = { squat: state({ skips: 1 }) };
    const after = applySession(
      before,
      [{ slug: "squat", setsPlanned: 3, setsDone: 3, loadKg: 42.5, rpe: 7 }],
      DATE,
    );
    expect(after.squat.lastLoadKg).toBe(42.5);
    expect(after.squat.rpeHistory).toEqual([7]);
    expect(after.squat.skips).toBe(0);
  });

  it("one set done is completed-with-data, never a skip", () => {
    const after = applySession(
      {},
      [{ slug: "squat", setsPlanned: 3, setsDone: 1, loadKg: 40, rpe: 9 }],
      DATE,
    );
    expect(after.squat.skips).toBe(0);
    expect(after.squat.rpeHistory).toEqual([9]);
  });

  it("zero sets in a finished session counts one consecutive skip", () => {
    const once = applySession(
      {},
      [{ slug: "row", setsPlanned: 3, setsDone: 0, loadKg: null }],
      DATE,
    );
    expect(once.row.skips).toBe(1);
    const twice = applySession(
      once,
      [{ slug: "row", setsPlanned: 3, setsDone: 0, loadKg: null }],
      DATE,
    );
    expect(twice.row.skips).toBe(2);
  });

  it("tracks consecutive reductions and progress resets them", () => {
    let s: ExerciseStates = { squat: state({ lastLoadKg: 40, rpeHistory: [10] }) };
    s = applySession(s, [{ slug: "squat", setsPlanned: 3, setsDone: 3, loadKg: 36, rpe: 10 }], DATE);
    expect(s.squat.reductions).toBe(1);
    s = applySession(s, [{ slug: "squat", setsPlanned: 3, setsDone: 3, loadKg: 32.5, rpe: 6 }], DATE);
    expect(s.squat.reductions).toBe(2);
    // Two reductions → the planner now routes around it.
    expect(slugsToAvoid(s).has("squat")).toBe(true);
  });
});

describe("swap plumbing", () => {
  it("skipped-twice exercises are excluded from the plan when alternatives exist", () => {
    const c = defaultConstraints();
    const baseline = generatePlan(c, DATE);
    const target = baseline.full[0].exercise.slug;
    const swapped = generatePlan(c, DATE, undefined, new Set([target]));
    const slugs = [...swapped.full, ...swapped.light, ...swapped.minimum].map(
      (i) => i.exercise.slug,
    );
    expect(slugs).not.toContain(target);
    // Same pattern still served — the slot swapped, it didn't vanish.
    expect(swapped.full[0].exercise.movement_pattern).toBe(
      baseline.full[0].exercise.movement_pattern,
    );
  });

  it("a swapped-out exercise that sat out gets its counters reset", () => {
    const states: ExerciseStates = { row: state({ skips: 2 }) };
    const after = resetSwapped(states, ["squat", "press"]);
    expect(after.row.skips).toBe(0);
  });

  it("counters do not reset while the exercise is still being served", () => {
    const states: ExerciseStates = { row: state({ skips: 2 }) };
    const after = resetSwapped(states, ["row"]);
    expect(after.row.skips).toBe(2);
  });
});
