/**
 * The constraint model — step 3, manual entry only. This is the same shape
 * the medical extractor will emit in step 6; documents are just another way
 * to fill in what the editor edits.
 *
 * Storage: localStorage for now. The device is never the source of truth in
 * the final architecture — when the backend lands, this becomes the read
 * cache / offline write queue and Postgres holds the record. The shape is
 * versioned so migration is mechanical.
 */
import { vocabulary } from "./library";

export type RegionState = "clear" | "easing" | "suppressed";
export type RomLevel = "full" | "limited" | "very_limited";

export interface Constraints {
  version: 1;
  /** Per body region: clear (train normally), easing (keep loads gentle),
      suppressed (exclude exercises that load it). */
  regions: Record<string, RegionState>;
  /** contraindicated_pattern ids the user wants avoided. */
  avoidPatterns: string[];
  /** Highest comfortable impact level. */
  maxImpact: string;
  /** Coarse range-of-motion limits for the joints where it matters most. */
  romLimits: Record<string, RomLevel>;
  /** Equipment the user actually has access to. */
  equipment: string[];
  /** Train from a chair or wheelchair: only chair-friendly exercises. */
  chairMode: boolean;
  updatedAt: string;
}

export const ROM_JOINTS = ["knee", "hip", "shoulder", "ankle"] as const;

/** Conservative degree caps behind the coarse ROM levels. Restrict rather
    than permit: "limited" already cuts deep-range work. */
export const ROM_DEGREES: Record<string, Record<RomLevel, number>> = {
  knee: { full: 999, limited: 100, very_limited: 70 },
  hip: { full: 999, limited: 90, very_limited: 60 },
  shoulder: { full: 999, limited: 120, very_limited: 90 },
  ankle: { full: 999, limited: 20, very_limited: 10 },
};

export const REGION_LABELS: Record<string, string> = {
  ankle: "Ankles",
  knee: "Knees",
  hip: "Hips",
  lumbar: "Lower back",
  thoracic: "Upper back",
  cervical: "Neck",
  shoulder: "Shoulders",
  elbow: "Elbows",
  wrist: "Wrists",
};

export const PATTERN_AVOID_LABELS: Record<string, string> = {
  axial_loading: "Weight pressing down on my spine",
  spinal_flexion_under_load: "Bending my back under load",
  spinal_extension_under_load: "Arching my back under load",
  spinal_rotation_under_load: "Twisting under load",
  overhead_pressing: "Pressing overhead",
  deep_knee_flexion_under_load: "Deep knee bends under load",
  high_impact: "Jumping and impact",
  breath_holding_valsalva: "Straining while holding my breath",
  unsupported_standing: "Balancing on one leg",
};

export function defaultConstraints(): Constraints {
  const regions: Record<string, RegionState> = {};
  for (const r of vocabulary.body_region) regions[r] = "clear";
  return {
    version: 1,
    regions,
    avoidPatterns: [],
    maxImpact: "moderate",
    romLimits: { knee: "full", hip: "full", shoulder: "full", ankle: "full" },
    equipment: [...vocabulary.equipment],
    chairMode: false,
    updatedAt: new Date().toISOString(),
  };
}

const STORAGE_KEY = "af.constraints.v1";

export function loadConstraints(): Constraints {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultConstraints();
    const parsed = JSON.parse(raw) as Constraints;
    if (parsed.version !== 1) return defaultConstraints();
    // Merge over defaults so new fields added later never come up undefined.
    return { ...defaultConstraints(), ...parsed };
  } catch {
    return defaultConstraints();
  }
}

export function saveConstraints(c: Constraints): Constraints {
  const stamped = { ...c, updatedAt: new Date().toISOString() };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stamped));
  } catch {
    // Storage full or unavailable — the in-memory copy still drives the UI.
  }
  return stamped;
}

/** One-sentence explanation per region, for the Readiness Map tap. */
export function explainRegion(region: string, state: RegionState): string {
  const label = REGION_LABELS[region] ?? region;
  switch (state) {
    case "clear":
      return `${label} — clear. Nothing limiting here.`;
    case "easing":
      return `${label} — easing. Loads stay gentle here for now.`;
    case "suppressed":
      return `${label} — resting. Exercises that load this area are off the plan.`;
  }
}
