/** Estimated nutrition targets for maintenance, gradual gain, or loss.
 * Weight is optional. Calorie limits are guardrails, not a guarantee of
 * adequate nutrition for every person or medical situation.
 */

import { type GoalId, type PlanPace } from "./goals";
import { type UnitSystem } from "./units";

export type ActivityLevel = "sedentary" | "light" | "moderate" | "high";

import { type TrainingPreferences } from "./weekly";

export type NutritionGoal = "maintain" | "lose" | "gain";
export interface Profile {
  nutritionGoal?: NutritionGoal;
  training?: TrainingPreferences;
  version: 1;
  sex: "male" | "female"; // for the BMR formula only
  birthYear: number;
  heightCm: number;
  /** null = the user prefers not to track weight. Everything still works. */
  weightKg: number | null;
  activity: ActivityLevel;
  /** What the plan optimizes for. Defaults applied on load for old profiles. */
  goals?: GoalId[];
  /** How hard to push. Affects deficit size and progression speed —
      never the safety floors. */
  pace?: PlanPace;
  /** Display units only — storage stays metric everywhere. */
  units?: UnitSystem;
}

export interface MealEntry {
  sourceKey?: string;
  id: string;
  date: string; // YYYY-MM-DD
  meal: "breakfast" | "lunch" | "dinner" | "snack";
  label: string;
  kcal: number;
}

export const ACTIVITY_FACTOR: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  high: 1.725,
};

/** Hard floors. The target NEVER goes below these, no matter the math. */
export const KCAL_FLOOR: Record<Profile["sex"], number> = {
  male: 1500,
  female: 1200,
};

/** Deficit by pace: the smaller of the kcal cap or the TDEE fraction.
    Even "aggressive" is conservative by broader standards — and the hard
    floors below always win. */
export const PACE_DEFICIT: Record<
  PlanPace,
  { capKcal: number; fraction: number }
> = {
  gentle: { capKcal: 250, fraction: 0.08 },
  steady: { capKcal: 400, fraction: 0.12 },
  aggressive: { capKcal: 500, fraction: 0.15 },
};

export function mifflinStJeor(
  sex: Profile["sex"],
  weightKg: number,
  heightCm: number,
  ageYears: number,
): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears;
  return sex === "male" ? base + 5 : base - 161;
}

export function goalForProfile(p: Profile | null): NutritionGoal {
  if (p?.nutritionGoal) return p.nutritionGoal;
  if (p?.goals?.some((g) => g === "lose_weight" || g === "slim_waist"))
    return "lose";
  if (p?.goals?.includes("muscle")) return "gain";
  return "maintain";
}

export interface CalorieTarget {
  goal: NutritionGoal;
  kcal: number;
  tdee: number;
  floorApplied: boolean;
}

/** null when no weight is on file — the diary works without a target. */
export function calorieTarget(
  p: Profile,
  currentYear: number,
): CalorieTarget | null {
  if (p.weightKg === null || p.weightKg <= 0) return null;
  const age = Math.max(18, currentYear - p.birthYear);
  const bmr = mifflinStJeor(p.sex, p.weightKg, p.heightCm, age);
  const tdee = bmr * ACTIVITY_FACTOR[p.activity];
  const paceRule = PACE_DEFICIT[p.pace ?? "steady"];
  const deficit = Math.min(paceRule.capKcal, tdee * paceRule.fraction);
  const goal = goalForProfile(p);
  const raw = Math.round(
    goal === "lose"
      ? tdee - deficit
      : goal === "gain"
        ? tdee + Math.min(250, tdee * 0.1)
        : tdee,
  );
  const floor = KCAL_FLOOR[p.sex];
  return {
    goal,
    kcal: Math.max(raw, floor),
    tdee: Math.round(tdee),
    floorApplied: raw < floor,
  };
}

// ------------------------------------------------------------------ storage

const PROFILE_KEY = "af.profile.v1";
const FOOD_KEY = "af.food.v1";

export function loadProfile(): Profile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Profile;
    if (p.version !== 1) return null;
    // Older profiles predate goals/pace/units.
    return { goals: [], pace: "steady", units: "metric", ...p };
  } catch {
    return null;
  }
}

export function saveProfile(p: Profile): void {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
  } catch {
    // In-memory state still drives the session.
  }
}

export function loadEntries(): MealEntry[] {
  try {
    return JSON.parse(localStorage.getItem(FOOD_KEY) ?? "[]") as MealEntry[];
  } catch {
    return [];
  }
}

export function addEntry(
  date: string,
  meal: MealEntry["meal"],
  label: string,
  kcal: number,
  sourceKey?: string,
): MealEntry[] {
  const entries = loadEntries();
  if (sourceKey && entries.some((e) => e.sourceKey === sourceKey))
    return entries;
  entries.push({
    id: crypto.randomUUID(),
    date,
    meal,
    label,
    kcal,
    ...(sourceKey ? { sourceKey } : {}),
  });
  try {
    localStorage.setItem(FOOD_KEY, JSON.stringify(entries));
  } catch {
    // See above.
  }
  return entries;
}

export function removeEntry(id: string): MealEntry[] {
  const entries = loadEntries().filter((e) => e.id !== id);
  try {
    localStorage.setItem(FOOD_KEY, JSON.stringify(entries));
  } catch {
    // See above.
  }
  return entries;
}

export function entriesForDate(
  entries: MealEntry[],
  date: string,
): MealEntry[] {
  return entries.filter((e) => e.date === date);
}

export function totalKcal(entries: MealEntry[]): number {
  return entries.reduce((sum, e) => sum + e.kcal, 0);
}
