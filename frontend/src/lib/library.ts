/**
 * Exercise library access. The seed JSON in /shared is the single source of
 * truth (same files the backend validates and serves); importing it directly
 * means the library browser works even on the static GitHub Pages deploy,
 * before any backend exists.
 */
import vocabularyJson from "../../../shared/vocabulary.json";
import exercisesJson from "../../../shared/exercises.json";

export interface Exercise {
  slug: string;
  name: string;
  movement_pattern: string;
  intensity_tier: string;
  position: string;
  equipment: string;
  axial_load: boolean;
  impact_level: string;
  joints_loaded: string[];
  rom_demand: Record<string, number>;
  flags: string[];
  wheelchair_ok: boolean;
  cue: string;
}

export type Vocabulary = Record<string, string[]>;

// The backend validates these files against the vocabulary at startup and in
// CI; the cast here trusts that contract rather than re-deriving literal types.
export const vocabulary = vocabularyJson as Vocabulary;
export const exercises = exercisesJson as unknown as Exercise[];

export const PATTERN_LABELS: Record<string, string> = {
  squat: "Squat",
  hinge: "Hinge",
  push_h: "Push (horizontal)",
  push_v: "Push (vertical)",
  pull_h: "Pull (horizontal)",
  pull_v: "Pull (vertical)",
  carry: "Carry",
  rotate: "Rotate",
  gait: "Gait",
  core: "Core",
  mobility: "Mobility",
};

export const FLAG_LABELS: Record<string, string> = {
  axial_loading: "axial load",
  spinal_flexion_under_load: "loaded spinal flexion",
  spinal_extension_under_load: "loaded spinal extension",
  spinal_rotation_under_load: "loaded spinal rotation",
  overhead_pressing: "overhead pressing",
  deep_knee_flexion_under_load: "deep loaded knee flexion",
  high_impact: "high impact",
  breath_holding_valsalva: "breath holding",
  unsupported_standing: "unsupported standing",
};
