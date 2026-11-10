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
export interface TrainingPreferences {
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
  return {
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
export interface WeekDay {
  date: string;
  title: string;
  rest: boolean;
  plan: DayPlan;
  guidance: string;
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
  let effortDays = 0;
  let previousEffort = prefs.weekdays.includes(6);
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
    // Consecutive training days alternate effort; extra days are recovery work.
    const recovery = effortDays >= 3 || previousEffort;
    const focusId = recovery
      ? "mobility"
      : prefs.days === 1 && (style === "strength" || style === "muscle")
        ? "full"
        : ROTATIONS[style][session % ROTATIONS[style].length];
    const focus = FOCUS[focusId];
    previousEffort = focusId !== "mobility";
    if (previousEffort) effortDays++;
    session++;
    let safe = effectiveConstraints(c, pain, day);
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
    const plan = generatePlan(
      safe,
      day,
      gentle ? exercises.filter((e) => e.intensity_tier !== "full") : exercises,
      avoid,
      profile?.goals ?? [],
      focus.slots,
    );
    const sets = gentle ? 2 : 3;
    plan.full = fit(plan.full, prefs.minutes, sets);
    plan.light = fit(
      plan.light,
      Math.min(prefs.minutes, 15),
      Math.min(sets, 2),
    );
    plan.minimum = fit(plan.minimum, 5, 1);
    return {
      date: day,
      title: focus.label,
      rest,
      plan,
      guidance:
        plan.full.length === 0
          ? "No exercises fit these limits. Review your limits with your clinician or choose rest; the plan will not override them."
          : recovery || style === "mobility"
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
