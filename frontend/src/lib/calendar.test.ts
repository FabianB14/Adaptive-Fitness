import { describe, expect, it } from "vitest";
import { monthDays, monthSummary, shiftMonth } from "./calendar";
import { type SessionLog } from "./logs";

describe("workout calendar dates", () => {
  it("aligns a Sunday-start month under Sunday in a Monday-first calendar", () => {
    const days = monthDays("2026-11-10");
    expect(days.slice(0, 6)).toEqual(Array(6).fill(null));
    expect(days[6]).toBe("2026-11-01");
    expect(days.filter(Boolean)).toHaveLength(30);
    expect(days).toHaveLength(42);
    expect(days[35]).toBe("2026-11-30");
  });

  it("includes leap day and fits a complete four-week February", () => {
    expect(monthDays("2024-02-15").filter(Boolean)).toHaveLength(29);
    expect(monthDays("2024-02-15")).toContain("2024-02-29");
    const days = monthDays("2027-02-10");
    expect(days).toHaveLength(28);
    expect(days[0]).toBe("2027-02-01");
    expect(days[27]).toBe("2027-02-28");
  });

  it("moves between months and years without skipping short months", () => {
    expect(shiftMonth("2026-01-31", 1)).toBe("2026-02-28");
    expect(shiftMonth("2024-03-31", -1)).toBe("2024-02-29");
    expect(shiftMonth("2026-12-10", 1)).toBe("2027-01-10");
    expect(shiftMonth("2026-01-10", -1)).toBe("2025-12-10");
  });

  it("keeps every local day through daylight-saving months", () => {
    for (const month of ["2026-03", "2026-11"]) {
      const days = monthDays(`${month}-15`).filter(Boolean);
      expect(new Set(days).size).toBe(days.length);
      days.forEach((day, index) => {
        expect(day).toBe(`${month}-${String(index + 1).padStart(2, "0")}`);
      });
    }
  });

  it("counts only logged workouts, rest, and completed sets within the month", () => {
    const log = (
      date: string,
      tier: SessionLog["tier"],
      setsDone?: number,
    ): SessionLog => ({
      id: date,
      date,
      tier,
      loggedAt: `${date}T12:00:00Z`,
      exercises:
        setsDone === undefined
          ? undefined
          : [{ slug: "squat", setsDone, setsPlanned: 3, loadKg: null }],
    });
    const logs = [
      log("2026-10-31", "full", 3),
      log("2026-11-01", "full", 2),
      log("2026-11-02", "rest"),
      log("2026-11-03", "light"),
      log("2026-11-04", "minimum", 0),
      log("2026-12-01", "full", 3),
    ];
    expect(monthSummary(logs, "2026-11-10")).toEqual({
      workouts: 3,
      rest: 1,
      sets: 2,
    });
    expect(monthSummary([], "2026-11-10")).toEqual({
      workouts: 0,
      rest: 0,
      sets: 0,
    });
  });
});
