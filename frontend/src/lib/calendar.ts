import { type SessionLog, type TierChoice } from "./logs";
import { localDateISO } from "./weekly";

export const SESSION_LABELS: Record<TierChoice, string> = {
  full: "Full workout",
  light: "Light workout",
  minimum: "Minimum workout",
  rest: "Rest day",
};

/** Local noon avoids UTC date shifts and daylight-saving boundaries. */
export function shiftMonth(date: string, offset: number): string {
  const current = new Date(`${date}T12:00:00`);
  const target = new Date(
    current.getFullYear(),
    current.getMonth() + offset,
    1,
    12,
  );
  const last = new Date(
    target.getFullYear(),
    target.getMonth() + 1,
    0,
    12,
  ).getDate();
  target.setDate(Math.min(current.getDate(), last));
  return localDateISO(target);
}

export function monthDays(date: string): (string | null)[] {
  const current = new Date(`${date}T12:00:00`);
  const first = new Date(current.getFullYear(), current.getMonth(), 1, 12);
  const last = new Date(
    current.getFullYear(),
    current.getMonth() + 1,
    0,
    12,
  ).getDate();
  const leading = (first.getDay() + 6) % 7;
  return Array.from(
    { length: Math.ceil((leading + last) / 7) * 7 },
    (_, index) => {
      const day = index - leading + 1;
      return day < 1 || day > last
        ? null
        : localDateISO(
            new Date(first.getFullYear(), first.getMonth(), day, 12),
          );
    },
  );
}

export function monthSummary(logs: SessionLog[], date: string) {
  const entries = logs.filter(
    (log) => log.date.slice(0, 7) === date.slice(0, 7),
  );
  const workouts = entries.filter((log) => log.tier !== "rest");
  return {
    workouts: workouts.length,
    rest: entries.length - workouts.length,
    sets: workouts.reduce(
      (total, log) =>
        total + (log.exercises ?? []).reduce((n, item) => n + item.setsDone, 0),
      0,
    ),
  };
}
