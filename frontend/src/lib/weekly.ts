import { exercises } from "./library";
import { type Constraints } from "./constraints";
import { effectiveConstraints } from "./engine";
import { type PainEvent } from "./logs";
import { type Profile } from "./nutrition";
import { generatePlan, type DayPlan, type PlannedItem } from "./planner";

export type PlanStyle =
  | "auto"
  | "starter"
  | "balanced"
  | "strength"
  | "muscle"
  | "endurance"
  | "mobility"
  | "chair"
  | "core";
export type TrainingLocation = "home" | "gym";
export type WorkoutType = "auto" | "weights" | "mobility";
export const WORKOUT_TYPES: { id: WorkoutType; label: string }[] = [
  { id: "auto", label: "Follow weekly plan" },
  { id: "weights", label: "Weights only" },
  { id: "mobility", label: "Mobility only" },
];
const isWorkoutType = (value: unknown): value is WorkoutType =>
  WORKOUT_TYPES.some((type) => type.id === value);
export const LOCATION_LABELS: Record<TrainingLocation, string> = {
  home: "Home",
  gym: "Gym",
};
const EQUIPMENT_IDS = ["bodyweight", "band", "dumbbell", "machine", "barbell"];
const cleanEquipment = (items: string[]) =>
  [...new Set(items)].filter((id) => EQUIPMENT_IDS.includes(id));
export interface TrainingPreferences {
  locationWorkoutTypes?: Partial<Record<TrainingLocation, WorkoutType>>;
  workoutTypes?: Partial<Record<number, WorkoutType>>;
  workoutOverrides?: Record<string, WorkoutType>;
  locations?: Partial<Record<number, TrainingLocation>>;
  locationEquipment?: Record<TrainingLocation, string[]>;
  locationOverrides?: Record<string, TrainingLocation>;
  days: number;
  weekdays: number[]; // Monday = 0
  minutes: number;
  experience: "new" | "returning" | "regular";
  style: PlanStyle;
}
export const WEEKDAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
export const PLAN_STYLES: {
  id: PlanStyle;
  label: string;
  description: string;
}[] = [
  {
    id: "auto",
    label: "Choose for me",
    description: "Match a starting plan to your goals and experience.",
  },
  {
    id: "starter",
    label: "Gentle start",
    description: "Short full-body sessions with time to recover.",
  },
  {
    id: "balanced",
    label: "Everyday fitness",
    description: "A mix of strength, easy cardio, and mobility.",
  },
  {
    id: "strength",
    label: "Build strength",
    description: "Alternate full-body, upper-body, and lower-body work.",
  },
  {
    id: "muscle",
    label: "Build muscle",
    description: "Repeat controlled strength movements and track your sets.",
  },
  {
    id: "endurance",
    label: "Walk & build stamina",
    description: "Cardio days supported by strength and mobility.",
  },
  {
    id: "mobility",
    label: "Move comfortably",
    description: "Gentle range-of-motion practice around your limits.",
  },
  {
    id: "chair",
    label: "Chair-friendly fitness",
    description: "Seated strength and movement with chair-friendly choices.",
  },
  {
    id: "core",
    label: "Core & balance",
    description: "Controlled trunk work alongside full-body movement.",
  },
];
const DEFAULT_DAYS: Record<number, number[]> = {
  1: [2],
  2: [1, 4],
  3: [0, 2, 4],
  4: [0, 1, 3, 5],
  5: [0, 1, 3, 4, 6],
  6: [0, 1, 2, 3, 4, 5],
};
export function trainingPreferences(
  value?: Partial<TrainingPreferences>,
): TrainingPreferences {
  const days = Number.isFinite(value?.days)
    ? Math.max(1, Math.min(6, Math.round(value!.days!)))
    : 3;
  const picked = [...new Set(value?.weekdays ?? [])].filter(
    (d) => Number.isInteger(d) && d >= 0 && d < 7,
  );
  const weekdays =
    picked.length === days ? picked.sort((a, b) => a - b) : DEFAULT_DAYS[days];
  const locations = Object.fromEntries(
    Object.entries(value?.locations ?? {}).filter(
      ([day, loc]) =>
        Number.isInteger(Number(day)) &&
        Number(day) >= 0 &&
        Number(day) < 7 &&
        (loc === "home" || loc === "gym"),
    ),
  );
  const locationOverrides = Object.fromEntries(
    Object.entries(value?.locationOverrides ?? {})
      .filter(
        ([date, loc]) =>
          /^\d{4}-\d{2}-\d{2}$/.test(date) && (loc === "home" || loc === "gym"),
      )
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-56),
  );
  return {
    locationWorkoutTypes: Object.fromEntries(
      Object.entries(value?.locationWorkoutTypes ?? {}).filter(
        ([location, type]) =>
          (location === "home" || location === "gym") && isWorkoutType(type),
      ),
    ),
    workoutTypes: Object.fromEntries(
      Object.entries(value?.workoutTypes ?? {}).filter(
        ([day, type]) =>
          Number.isInteger(Number(day)) &&
          Number(day) >= 0 &&
          Number(day) < 7 &&
          isWorkoutType(type),
      ),
    ),
    workoutOverrides: Object.fromEntries(
      Object.entries(value?.workoutOverrides ?? {})
        .filter(
          ([date, type]) =>
            /^\d{4}-\d{2}-\d{2}$/.test(date) && isWorkoutType(type),
        )
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-56),
    ),
    locations,
    locationOverrides,
    locationEquipment: value?.locationEquipment
      ? {
          home: cleanEquipment(value.locationEquipment.home ?? []),
          gym: cleanEquipment(value.locationEquipment.gym ?? []),
        }
      : undefined,
    days,
    weekdays: [...weekdays],
    minutes: [10, 20, 30, 45].includes(value?.minutes ?? 0)
      ? value!.minutes!
      : 20,
    experience: ["new", "returning", "regular"].includes(
      value?.experience ?? "",
    )
      ? value!.experience!
      : "new",
    style: PLAN_STYLES.some((s) => s.id === value?.style)
      ? value!.style!
      : "auto",
  };
}
export function localDateISO(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return localDateISO(d);
}
export function mondayOf(iso: string): string {
  return addDays(iso, -((new Date(`${iso}T12:00:00`).getDay() + 6) % 7));
}
export function chooseStyle(
  p: Profile | null,
  c: Constraints,
): Exclude<PlanStyle, "auto"> {
  const prefs = trainingPreferences(p?.training);
  if (c.chairMode) return "chair";
  if (prefs.style !== "auto") return prefs.style;
  const goals = p?.goals ?? [];
  if (goals.includes("injury_recovery")) return "mobility";
  if (goals.includes("diastasis_recti") || goals.includes("core"))
    return "core";
  if (goals.includes("muscle")) return "muscle";
  if (goals.includes("strength")) return "strength";
  if (goals.includes("endurance") || goals.includes("lose_weight"))
    return "endurance";
  if (goals.includes("flexibility")) return "mobility";
  if (
    prefs.experience !== "regular" ||
    p?.pace === "gentle" ||
    p?.activity === "sedentary"
  )
    return "starter";
  return "balanced";
}
const FOCUS: Record<string, { label: string; slots: string[][] }> = {
  full: {
    label: "Full-body strength",
    slots: [
      ["squat", "hinge"],
      ["push_h", "push_v"],
      ["pull_h", "pull_v"],
      ["hinge", "squat"],
      ["core"],
      ["mobility"],
    ],
  },
  upper: {
    label: "Upper body & core",
    slots: [
      ["push_h", "push_v"],
      ["pull_h", "pull_v"],
      ["core"],
      ["push_v", "push_h"],
      ["pull_v", "pull_h"],
      ["mobility"],
    ],
  },
  lower: {
    label: "Lower body & balance",
    slots: [
      ["squat", "hinge"],
      ["hinge", "squat"],
      ["core"],
      ["carry", "gait"],
      ["mobility"],
    ],
  },
  cardio: {
    label: "Cardio & mobility",
    slots: [["gait"], ["mobility"], ["core"], ["mobility"]],
  },
  core: {
    label: "Core & full-body support",
    slots: [
      ["core"],
      ["squat", "hinge"],
      ["pull_h", "pull_v"],
      ["push_h", "push_v"],
      ["mobility"],
    ],
  },
  mobility: {
    label: "Gentle mobility",
    slots: [["mobility"], ["mobility"], ["mobility"], ["mobility"]],
  },
};
const ROTATIONS: Record<Exclude<PlanStyle, "auto">, string[]> = {
  starter: ["full", "mobility", "full"],
  balanced: ["full", "cardio", "full"],
  strength: ["full", "upper", "lower"],
  muscle: ["upper", "lower", "full"],
  endurance: ["cardio", "full", "cardio"],
  mobility: ["mobility"],
  chair: ["full", "mobility", "core"],
  core: ["core", "mobility", "full"],
};
const WEIGHT_FOCUS = [
  {
    label: "Full-body weights",
    slots: [
      ["squat", "hinge"],
      ["push_h", "push_v"],
      ["pull_h", "pull_v"],
      ["hinge", "squat"],
      ["carry", "core", "rotate"],
    ],
  },
  {
    label: "Upper-body weights",
    slots: [
      ["push_h", "push_v"],
      ["pull_h", "pull_v"],
      ["push_v", "push_h"],
      ["pull_v", "pull_h"],
      ["carry", "core", "rotate"],
    ],
  },
  {
    label: "Lower-body weights",
    slots: [
      ["squat", "hinge"],
      ["hinge", "squat"],
      ["carry", "core", "rotate"],
      ["squat", "hinge"],
    ],
  },
];

/** Explicit dates win over weekday choices, then location defaults. */
export function workoutTypeForDate(
  prefs: TrainingPreferences,
  date: string,
  weekday: number,
  location?: TrainingLocation,
): WorkoutType {
  return (
    [
      prefs.workoutOverrides?.[date],
      prefs.workoutTypes?.[weekday],
      location ? prefs.locationWorkoutTypes?.[location] : undefined,
    ].find((type) => type === "weights" || type === "mobility") ?? "auto"
  );
}
export interface WeekDay {
  date: string;
  title: string;
  rest: boolean;
  plan: DayPlan;
  guidance: string;
  location?: TrainingLocation;
  workoutType?: WorkoutType;
}
export interface WeekPlan {
  start: string;
  style: Exclude<PlanStyle, "auto">;
  days: WeekDay[];
}
function fit(
  items: PlannedItem[],
  minutes: number,
  sets: number,
): PlannedItem[] {
  let remaining = Math.max(1, minutes - 2); // allow a gentle warm-up / transitions
  const result: PlannedItem[] = [];
  for (const item of items) {
    const pattern = item.exercise.movement_pattern;
    const count = Math.min(sets, item.sets);
    const duration =
      pattern === "gait"
        ? Math.min(10, Math.max(2, Math.floor(remaining / 2)))
        : pattern === "mobility"
          ? 2
          : count * 2;
    if (duration > remaining) continue;
    result.push({
      ...item,
      sets: pattern === "gait" || pattern === "mobility" ? 1 : count,
      dose:
        pattern === "gait" || pattern === "mobility"
          ? `${duration} min`
          : `${count} × 8`,
    });
    remaining -= duration;
  }
  return result;
}
export function generateWeek(
  c: Constraints,
  date: string,
  profile: Profile | null,
  avoid = new Set<string>(),
  pain: PainEvent[] = [],
): WeekPlan {
  const prefs = trainingPreferences(profile?.training);
  const style = chooseStyle(profile, c);
  const start = mondayOf(date);
  let session = 0;
  let weightSession = 0;
  let effortDays = 0;
  const lastSunday = addDays(start, -1);
  const sundayLocation = prefs.locationEquipment
    ? (prefs.locationOverrides?.[lastSunday] ?? prefs.locations?.[6] ?? "home")
    : undefined;
  const sundayType = workoutTypeForDate(prefs, lastSunday, 6, sundayLocation);
  let previousEffort =
    prefs.weekdays.includes(6) &&
    sundayType !== "mobility" &&
    !(sundayType === "auto" && style === "mobility");
  const gentle =
    prefs.experience !== "regular" ||
    profile?.pace === "gentle" ||
    profile?.activity === "sedentary";
  const days = Array.from({ length: 7 }, (_, weekday): WeekDay => {
    const day = addDays(start, weekday);
    const rest = !prefs.weekdays.includes(weekday);
    const empty: DayPlan = {
      date: day,
      full: [],
      light: [],
      minimum: [],
      notes: [],
    };
    if (rest) {
      previousEffort = false;
      return {
        date: day,
        title: "Rest & recharge",
        rest,
        plan: empty,
        guidance: "Rest is part of your plan. No catch-up workout needed.",
      };
    }
    const location = prefs.locationEquipment
      ? (prefs.locationOverrides?.[day] ?? prefs.locations?.[weekday] ?? "home")
      : undefined;
    const workoutType = workoutTypeForDate(prefs, day, weekday, location);
    // Auto keeps its recovery rotation. Explicit weight days reduce volume
    // when recovery is due instead of changing the requested workout type.
    const recovery = effortDays >= 3 || previousEffort;
    const focusId = recovery
      ? "mobility"
      : prefs.days === 1 && (style === "strength" || style === "muscle")
        ? "full"
        : ROTATIONS[style][session % ROTATIONS[style].length];
    const focus =
      workoutType === "weights"
        ? WEIGHT_FOCUS[weightSession++ % WEIGHT_FOCUS.length]
        : workoutType === "mobility"
          ? FOCUS.mobility
          : FOCUS[focusId];
    const mobility =
      workoutType === "mobility" ||
      (workoutType === "auto" && focusId === "mobility");
    previousEffort = !mobility;
    if (previousEffort) effortDays++;
    session++;
    let safe = effectiveConstraints(c, pain, day);
    if (location && prefs.locationEquipment)
      safe = { ...safe, equipment: prefs.locationEquipment[location] };
    if (style === "chair") safe = { ...safe, chairMode: true };
    if (gentle) {
      safe = {
        ...safe,
        maxImpact: ["moderate", "high"].includes(safe.maxImpact)
          ? "low"
          : safe.maxImpact,
      };
    }
    if (profile?.goals?.includes("diastasis_recti"))
      safe = {
        ...safe,
        avoidPatterns: [
          ...safe.avoidPatterns,
          "breath_holding_valsalva",
          "spinal_flexion_under_load",
        ],
      };
    let pool = gentle
      ? exercises.filter((e) => e.intensity_tier !== "full")
      : exercises;
    if (workoutType === "weights")
      pool = pool.filter(
        (e) =>
          ["dumbbell", "machine", "barbell"].includes(e.equipment) &&
          e.movement_pattern !== "mobility" &&
          e.movement_pattern !== "gait",
      );
    if (workoutType === "mobility")
      pool = pool.filter((e) => e.movement_pattern === "mobility");
    const plan = generatePlan(
      safe,
      day,
      pool,
      avoid,
      profile?.goals ?? [],
      focus.slots,
      workoutType === "auto" ? undefined : focus.slots.slice(0, 2),
    );
    if (location) plan.location = location;
    if (workoutType !== "auto") plan.workoutType = workoutType;
    const lighterWeights = workoutType === "weights" && recovery;
    const sets = gentle || lighterWeights ? 2 : 3;
    const sessionMinutes = lighterWeights
      ? Math.max(5, Math.floor(prefs.minutes * 0.7))
      : prefs.minutes;
    plan.full = fit(plan.full, sessionMinutes, sets);
    plan.light = fit(
      plan.light,
      Math.min(sessionMinutes, 15),
      Math.min(sets, 2),
    );
    plan.minimum = fit(plan.minimum, 5, 1);
    if (workoutType === "weights") {
      plan.notes.push(
        "Weights only: use your selected dumbbells, machines, or barbell. Light and Minimum keep weight exercises with fewer sets.",
      );
      if (lighterWeights)
        plan.notes.push(
          "A lighter weights day for recovery: fewer sets, comfortable loads, and extra rest between sets. You can move this day or choose rest if you need more recovery.",
        );
      if (plan.full.length === 0)
        plan.notes.push(
          "No weight exercises match this day's equipment and movement limits. Update the equipment for this location, choose another workout type, or rest.",
        );
    }
    return {
      date: day,
      title: lighterWeights ? `${focus.label} · lighter day` : focus.label,
      location,
      workoutType,
      rest,
      plan,
      guidance:
        plan.full.length === 0
          ? workoutType === "weights"
            ? "No weight exercises match this equipment and your movement limits. Review the equipment, change workout type, or choose rest."
            : "No exercises fit these limits. Review your limits with your clinician or choose rest; the plan will not override them."
          : mobility
            ? "Easy movement today. Stay within a comfortable range."
            : "Start gently. Choose Light or Minimum if energy is low; stop any movement that hurts.",
    };
  });
  return { start, style, days };
}
/** One source for the weekly preview, Today, and the actual session. */
export function planForDate(
  c: Constraints,
  date: string,
  profile: Profile | null,
  avoid = new Set<string>(),
): DayPlan {
  if (!profile?.training)
    return generatePlan(c, date, undefined, avoid, profile?.goals ?? []);
  return generateWeek(c, date, profile, avoid).days.find(
    (d) => d.date === date,
  )!.plan;
}
