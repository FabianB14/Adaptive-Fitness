/**
 * The deterministic constraint filter — the TypeScript twin of
 * backend/app/data/library.py::filter_exercises. Plan generation is a filter
 * over the pool, never an LLM call. Restrictive by design: when in doubt an
 * exercise drops out.
 */
import { ROM_DEGREES, type Constraints } from "./constraints";
import { vocabulary, type Exercise } from "./library";

const IMPACT_ORDER = vocabulary.impact_level; // none < low < moderate < high

export function allowedByConstraints(e: Exercise, c: Constraints): boolean {
  // Suppressed regions exclude everything that loads them.
  for (const joint of e.joints_loaded) {
    if (c.regions[joint] === "suppressed") return false;
  }

  // Patterns the user avoids. axial_loading and high_impact map to exercise
  // properties; the rest are explicit flags.
  const banned = new Set(c.avoidPatterns);
  if (banned.has("axial_loading") && e.axial_load) return false;
  if (banned.has("high_impact") && e.impact_level === "high") return false;
  if (e.flags.some((f) => banned.has(f))) return false;

  // Impact ceiling.
  if (IMPACT_ORDER.indexOf(e.impact_level) > IMPACT_ORDER.indexOf(c.maxImpact))
    return false;

  // Equipment: "none" is always available.
  if (e.equipment !== "none" && !c.equipment.includes(e.equipment)) return false;

  // Chair mode.
  if (c.chairMode && !e.wheelchair_ok) return false;

  // ROM limits: an exercise demanding more range than a joint has drops out.
  for (const [joint, level] of Object.entries(c.romLimits)) {
    const cap = ROM_DEGREES[joint]?.[level] ?? 999;
    if ((e.rom_demand[joint] ?? 0) > cap) return false;
  }

  return true;
}

export function filterPool(pool: Exercise[], c: Constraints): Exercise[] {
  return pool.filter((e) => allowedByConstraints(e, c));
}

/** True if the exercise loads any region the user is easing — kept in the
    pool, but the planner deprioritizes it and softens the dose. */
export function loadsEasingRegion(e: Exercise, c: Constraints): boolean {
  return e.joints_loaded.some((j) => c.regions[j] === "easing");
}
