import { afterEach, describe, expect, it, vi } from "vitest";
import { exercises } from "./library";
import { addLog, loadLogs, snapshotWorkout } from "./logs";
import { type DayPlan } from "./planner";

afterEach(() => vi.unstubAllGlobals());
function storage() {
  const data = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => data.set(key, value),
  });
}
const plan = (): DayPlan => ({
  date: "2026-11-10",
  location: "gym",
  workoutType: "weights",
  notes: [],
  light: [],
  minimum: [],
  full: [{ exercise: { ...exercises[0] }, dose: "3 × 8", sets: 3 }],
});

describe("workout history snapshots", () => {
  it("keeps original names, doses, location, and actual sets when the plan changes", () => {
    storage();
    const original = plan();
    const item = original.full[0];
    const name = item.exercise.name;
    addLog(
      original.date,
      "full",
      7,
      [{ slug: item.exercise.slug, setsPlanned: 3, setsDone: 2, loadKg: 10 }],
      snapshotWorkout(original, "full"),
    );
    original.location = "home";
    original.workoutType = "mobility";
    item.exercise.name = "Changed exercise";
    item.dose = "1 × 8";
    const saved = loadLogs()[0];
    expect(saved.workout?.location).toBe("gym");
    expect(saved.workout?.workoutType).toBe("weights");
    expect(saved.workout?.exercises[0]).toMatchObject({ name, dose: "3 × 8" });
    expect(saved.exercises?.[0]).toMatchObject({ setsDone: 2, loadKg: 10 });
  });

  it("preserves quick-log plans without inventing completed sets or details for old entries", () => {
    storage();
    const original = plan();
    addLog("2026-11-09", "light", 6);
    addLog(
      original.date,
      "full",
      undefined,
      undefined,
      snapshotWorkout(original, "full"),
    );
    const logs = loadLogs();
    expect(logs[0].workout).toBeUndefined();
    expect(logs[0].exercises).toBeUndefined();
    expect(logs[1].exercises).toBeUndefined();
    expect(logs[1].workout?.exercises).toHaveLength(1);
    addLog(original.date, "rest");
    expect(loadLogs()).toHaveLength(2);
    expect(loadLogs()[1].workout).toBeUndefined();
    expect(loadLogs()[1].tier).toBe("rest");
  });
});
