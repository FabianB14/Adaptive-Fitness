/**
 * Body metrics, measurements, and activity — the progress system's data.
 *
 * Safety rules from the brief, non-negotiable:
 * - No goal weight below a healthy BMI for the user's height.
 * - Weight is optional; everything works without it.
 * - Trends, not daily numbers, are the default view.
 */

export interface WeightEntry {
  date: string; // YYYY-MM-DD
  kg: number;
}

export interface MeasurementEntry {
  date: string;
  type: string; // waist | hips | chest | arm | thigh
  cm: number;
}

export interface ActivityEntry {
  date: string;
  steps: number;
  cardioMin: number;
}

export interface MetricsStore {
  weights: WeightEntry[];
  measurements: MeasurementEntry[];
  activity: ActivityEntry[];
}

export interface GoalRange {
  start: number;
  goal: number;
}

export interface GoalsStore {
  weight: GoalRange | null;
  measurements: Record<string, GoalRange>;
}

export const MEASUREMENT_TYPES: { id: string; label: string }[] = [
  { id: "waist", label: "Waist" },
  { id: "hips", label: "Hips" },
  { id: "chest", label: "Chest" },
  { id: "arm", label: "Arm" },
  { id: "thigh", label: "Thigh" },
];

const METRICS_KEY = "af.metrics.v1";
const GOALS_KEY = "af.goals.v1";

// ------------------------------------------------------------------ storage

export function loadMetrics(): MetricsStore {
  try {
    const raw = localStorage.getItem(METRICS_KEY);
    if (raw) return { weights: [], measurements: [], activity: [], ...JSON.parse(raw) };
  } catch {
    // fall through
  }
  return { weights: [], measurements: [], activity: [] };
}

function saveMetrics(m: MetricsStore): MetricsStore {
  try {
    localStorage.setItem(METRICS_KEY, JSON.stringify(m));
  } catch {
    // In-memory state still drives the session.
  }
  return m;
}

export function addWeight(date: string, kg: number): MetricsStore {
  const m = loadMetrics();
  m.weights = [...m.weights.filter((w) => w.date !== date), { date, kg }].sort(
    (a, b) => a.date.localeCompare(b.date),
  );
  return saveMetrics(m);
}

export function addMeasurement(date: string, type: string, cm: number): MetricsStore {
  const m = loadMetrics();
  m.measurements = [
    ...m.measurements.filter((e) => !(e.date === date && e.type === type)),
    { date, type, cm },
  ].sort((a, b) => a.date.localeCompare(b.date));
  return saveMetrics(m);
}

export function addActivity(
  date: string,
  patch: { steps?: number; cardioMin?: number },
): MetricsStore {
  const m = loadMetrics();
  const existing = m.activity.find((a) => a.date === date);
  const merged: ActivityEntry = {
    date,
    steps: patch.steps ?? existing?.steps ?? 0,
    cardioMin: patch.cardioMin ?? existing?.cardioMin ?? 0,
  };
  m.activity = [...m.activity.filter((a) => a.date !== date), merged].sort(
    (a, b) => a.date.localeCompare(b.date),
  );
  return saveMetrics(m);
}

export function loadGoals(): GoalsStore {
  try {
    const raw = localStorage.getItem(GOALS_KEY);
    if (raw) return { weight: null, measurements: {}, ...JSON.parse(raw) };
  } catch {
    // fall through
  }
  return { weight: null, measurements: {} };
}

export function saveGoals(g: GoalsStore): GoalsStore {
  try {
    localStorage.setItem(GOALS_KEY, JSON.stringify(g));
  } catch {
    // See above.
  }
  return g;
}

// ------------------------------------------------------------------- safety

/** The lightest healthy weight for a height (BMI 18.5). Goals never go
    below this, no matter what is typed. */
export function minHealthyWeightKg(heightCm: number): number {
  const meters = heightCm / 100;
  return Math.round(18.5 * meters * meters * 10) / 10;
}

/** Clamp a weight goal to the healthy floor. Returns the goal that will
    actually be stored plus whether the floor kicked in. */
export function clampWeightGoal(
  goalKg: number,
  heightCm: number,
): { goalKg: number; floored: boolean } {
  const floor = minHealthyWeightKg(heightCm);
  if (goalKg < floor) return { goalKg: floor, floored: true };
  return { goalKg, floored: false };
}

// ----------------------------------------------------------------- progress

/** Direction-agnostic progress from start toward goal, 0–100. Works for
    loss and gain alike. Null when there's no meaningful span. */
export function progressPct(
  start: number,
  current: number,
  goal: number,
): number | null {
  const span = goal - start;
  if (Math.abs(span) < 0.001) return null;
  const pct = ((current - start) / span) * 100;
  return Math.max(0, Math.min(100, Math.round(pct)));
}

/** 7-day rolling average — the trend the UI shows instead of daily numbers.
    Falls back to the latest entry when the window is empty. */
export function weightTrend(weights: WeightEntry[], todayISO: string): number | null {
  if (weights.length === 0) return null;
  const cutoff = new Date(Date.parse(todayISO + "T00:00:00Z") - 6 * 86_400_000)
    .toISOString()
    .slice(0, 10);
  const window = weights.filter((w) => w.date >= cutoff && w.date <= todayISO);
  const source = window.length > 0 ? window : [weights[weights.length - 1]];
  const sum = source.reduce((s, w) => s + w.kg, 0);
  return Math.round((sum / source.length) * 10) / 10;
}

export function latestMeasurement(
  measurements: MeasurementEntry[],
  type: string,
): MeasurementEntry | null {
  const of = measurements.filter((m) => m.type === type);
  return of.length > 0 ? of[of.length - 1] : null;
}

// ----------------------------------------------------------------- activity

function weekStartISO(dateISO: string): string {
  const t = new Date(dateISO + "T00:00:00Z");
  const day = (t.getUTCDay() + 6) % 7; // Monday = 0
  return new Date(t.getTime() - day * 86_400_000).toISOString().slice(0, 10);
}

export function weekTotals(
  activity: ActivityEntry[],
  todayISO: string,
): { steps: number; cardioMin: number } {
  const start = weekStartISO(todayISO);
  const inWeek = activity.filter((a) => a.date >= start && a.date <= todayISO);
  return {
    steps: inWeek.reduce((s, a) => s + a.steps, 0),
    cardioMin: inWeek.reduce((s, a) => s + a.cardioMin, 0),
  };
}

export function lifetimeTotals(activity: ActivityEntry[]): {
  steps: number;
  cardioMin: number;
} {
  return {
    steps: activity.reduce((s, a) => s + a.steps, 0),
    cardioMin: activity.reduce((s, a) => s + a.cardioMin, 0),
  };
}

/** Gentle weekly targets derived from activity level — set by the system,
    never typed in by the user, and deliberately modest. */
export function weeklyTargets(
  activityLevel: string | undefined,
): { steps: number; cardioMin: number } {
  switch (activityLevel) {
    case "sedentary":
      return { steps: 30_000, cardioMin: 60 };
    case "light":
      return { steps: 42_000, cardioMin: 90 };
    case "moderate":
      return { steps: 56_000, cardioMin: 120 };
    case "high":
      return { steps: 70_000, cardioMin: 150 };
    default:
      return { steps: 42_000, cardioMin: 90 };
  }
}
