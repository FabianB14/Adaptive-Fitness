/**
 * Client side of the medical-document pipeline: types for the backend's
 * /extract response, and the merge that folds accepted findings into the
 * user's constraints.
 *
 * The merge is restriction-only: a document can tighten limits, never
 * loosen ones the user (or a previous document) already set.
 */
import {
  ROM_DEGREES,
  type Constraints,
  type RegionState,
  type RomLevel,
} from "./constraints";
import { vocabulary } from "./library";

export interface ExtractedRegion {
  region: string;
  side: string | null;
  severity: string;
  source: string;
  confidence: number;
  low_confidence: boolean;
  suggested_state: RegionState;
}

export interface ExtractedRomLimit {
  joint: string;
  motion: string;
  max_deg: number;
}

export interface ExtractionResult {
  regions: ExtractedRegion[];
  contraindicated_patterns: string[];
  rom_limits: ExtractedRomLimit[];
  cardio_impact_ceiling: string;
  notes_for_user: string[];
  unparsed_flags: string[];
  document_retained: boolean;
}

const STATE_RANK: Record<RegionState, number> = {
  clear: 0,
  easing: 1,
  suppressed: 2,
};

const ROM_RANK: Record<RomLevel, number> = {
  full: 0,
  limited: 1,
  very_limited: 2,
};

function romLevelForDegrees(joint: string, maxDeg: number): RomLevel {
  const caps = ROM_DEGREES[joint];
  if (!caps) return "full";
  if (maxDeg <= caps.very_limited) return "very_limited";
  if (maxDeg <= caps.limited) return "limited";
  return "full";
}

/** Fold the accepted findings into existing constraints. Restriction-only:
    every field moves toward safer, never back. */
export function applyExtraction(
  base: Constraints,
  accepted: {
    regions: ExtractedRegion[];
    patterns: string[];
    romLimits: ExtractedRomLimit[];
    impactCeiling: string | null;
  },
): Constraints {
  const regions = { ...base.regions };
  for (const r of accepted.regions) {
    const current = regions[r.region] ?? "clear";
    if (STATE_RANK[r.suggested_state] > STATE_RANK[current]) {
      regions[r.region] = r.suggested_state;
    }
  }

  const avoidPatterns = [
    ...new Set([...base.avoidPatterns, ...accepted.patterns]),
  ];

  const romLimits = { ...base.romLimits };
  for (const limit of accepted.romLimits) {
    if (!(limit.joint in ROM_DEGREES)) continue;
    const suggested = romLevelForDegrees(limit.joint, limit.max_deg);
    const current = romLimits[limit.joint] ?? "full";
    if (ROM_RANK[suggested] > ROM_RANK[current]) {
      romLimits[limit.joint] = suggested;
    }
  }

  let maxImpact = base.maxImpact;
  if (accepted.impactCeiling) {
    const order = vocabulary.impact_level;
    if (order.indexOf(accepted.impactCeiling) < order.indexOf(maxImpact)) {
      maxImpact = accepted.impactCeiling;
    }
  }

  return { ...base, regions, avoidPatterns, romLimits, maxImpact };
}
