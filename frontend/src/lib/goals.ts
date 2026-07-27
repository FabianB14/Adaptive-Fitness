/** Goals the user picks in setup. They weight the plan — extra slots,
    exercise preferences, nutrition emphasis — they never gate features. */

export type GoalId =
  | "lose_weight"
  | "slim_waist"
  | "strength"
  | "muscle"
  | "core"
  | "diastasis_recti"
  | "flexibility"
  | "endurance"
  | "injury_recovery"
  | "energy";

export const GOALS: { id: GoalId; label: string }[] = [
  { id: "lose_weight", label: "Lose weight" },
  { id: "slim_waist", label: "Slim my waist" },
  { id: "strength", label: "Get stronger" },
  { id: "muscle", label: "Build muscle" },
  { id: "core", label: "Strengthen my core" },
  { id: "diastasis_recti", label: "Heal diastasis recti" },
  { id: "flexibility", label: "Get more flexible" },
  { id: "endurance", label: "Walk or run further" },
  { id: "injury_recovery", label: "Work around injuries" },
  { id: "energy", label: "Feel better day to day" },
];

export type PlanPace = "gentle" | "steady" | "aggressive";

export const PACES: { id: PlanPace; label: string; desc: string }[] = [
  {
    id: "gentle",
    label: "Gentle",
    desc: "Small calorie deficit, slow progression. Built for consistency.",
  },
  {
    id: "steady",
    label: "Steady",
    desc: "The balanced default — visible progress without strain.",
  },
  {
    id: "aggressive",
    label: "Aggressive",
    desc: "The strongest pace we allow. Safety floors always hold — we push pace, not corners.",
  },
];
