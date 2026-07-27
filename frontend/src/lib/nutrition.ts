/**
 * Nutrition — pulled ahead of the medical-upload step at the client's
 * request. Calorie target from Mifflin-St Jeor × activity, minus a
 * conservative deficit. Non-negotiables from the brief:
 *  - hard floor on calorie targets, regardless of anything
 *  - the app is fully usable without ever entering a weight
 *  - no aggressive deficits
 */

export type ActivityLevel = "sedentary" | "light" | "moderate" | "high";

export interface Profile {
  version: 1;
  sex: "male" | "female"; // for the BMR formula only
  birthYear: number;
  heightCm: number;
  /** null = the user prefers not to track weight. Everything still works. */
  weightKg: number | null;
  activity: ActivityLevel;
}

export interface MealEntry {
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

/** Deficit is the smaller of 15% of TDEE or 500 kcal — conservative by design. */
export const MAX_DEFICIT_KCAL = 500;
export const MAX_DEFICIT_FRACTION = 0.15;

export function mifflinStJeor(
  sex: Profile["sex"],
  weightKg: number,
  heightCm: number,
  ageYears: number,
): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears;
  return sex === "male" ? base + 5 : base - 161;
}

export interface CalorieTarget {
  kcal: number;
  tdee: number;
  floorApplied: boolean;
}

/** null when no weight is on file — the diary works without a target. */
export function calorieTarget(p: Profile, currentYear: number): CalorieTarget | null {
  if (p.weightKg === null || p.weightKg <= 0) return null;
  const age = Math.max(18, currentYear - p.birthYear);
  const bmr = mifflinStJeor(p.sex, p.weightKg, p.heightCm, age);
  const tdee = bmr * ACTIVITY_FACTOR[p.activity];
  const deficit = Math.min(MAX_DEFICIT_KCAL, tdee * MAX_DEFICIT_FRACTION);
  const raw = Math.round(tdee - deficit);
  const floor = KCAL_FLOOR[p.sex];
  return {
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
    return p.version === 1 ? p : null;
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
): MealEntry[] {
  const entries = loadEntries();
  entries.push({ id: crypto.randomUUID(), date, meal, label, kcal });
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

export function entriesForDate(entries: MealEntry[], date: string): MealEntry[] {
  return entries.filter((e) => e.date === date);
}

export function totalKcal(entries: MealEntry[]): number {
  return entries.reduce((sum, e) => sum + e.kcal, 0);
}
