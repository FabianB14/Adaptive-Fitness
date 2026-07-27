/**
 * Deterministic day-plan generator. Same date + same constraints = same plan,
 * every time — reproducible, testable, no model calls. Runs on-device today;
 * when the backend lands this same logic moves server-side and the client
 * result becomes the offline fallback.
 */
import { type Constraints } from "./constraints";
import { filterPool, loadsEasingRegion } from "./filter";
import { REGION_LABELS } from "./constraints";
import { exercises as fullPool, type Exercise } from "./library";

export interface PlannedItem {
  exercise: Exercise;
  /** Display dose, e.g. "3 × 8", "2 min". */
  dose: string;
  /** Loggable sets for the session view (timed work = 1 "set"). */
  sets: number;
  /** Present when the dose was softened because the exercise touches an
      easing region. */
  note?: string;
}

export interface DayPlan {
  date: string;
  full: PlannedItem[];
  light: PlannedItem[];
  minimum: PlannedItem[];
  /** Plain-language notes about what the constraints removed. */
  notes: string[];
}

// Pattern templates per tier. Slots list acceptable patterns in preference
// order; the first pattern with candidates wins the slot.
const FULL_SLOTS = [
  ["squat", "hinge"],
  ["hinge", "squat"],
  ["push_h", "push_v"],
  ["pull_h", "pull_v"],
  ["core", "rotate"],
  ["carry", "rotate", "gait"],
];
const LIGHT_SLOTS = [
  ["squat", "hinge"],
  ["push_h", "push_v"],
  ["pull_h", "pull_v"],
  ["mobility", "core"],
];
const MINIMUM_SLOTS = [
  ["mobility"],
  ["mobility", "core"],
  ["gait", "core", "mobility"],
];

// Deterministic PRNG (mulberry32) seeded from a string.
function seedFrom(text: string): number {
  let h = 1779033703;
  for (let i = 0; i < text.length; i++) {
    h = Math.imul(h ^ text.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function dose(
  e: Exercise,
  tier: "full" | "light" | "minimum",
): { text: string; sets: number } {
  if (e.movement_pattern === "gait") {
    // Named durations ("10-minute walk") keep their own dose.
    return {
      text: tier === "full" ? "15 min" : tier === "light" ? "10 min" : "5 min",
      sets: 1,
    };
  }
  if (e.movement_pattern === "mobility") {
    return { text: tier === "minimum" ? "1–2 min" : "2 min", sets: 1 };
  }
  const sets = tier === "full" ? 3 : tier === "light" ? 2 : 1;
  const reps = tier === "minimum" ? 10 : 8;
  return { text: `${sets} × ${reps}`, sets };
}

const TIER_PREFERENCE: Record<string, string[]> = {
  full: ["full", "light"],
  light: ["light", "minimum", "full"],
  minimum: ["minimum"],
};

function pickForTier(
  pool: Exercise[],
  c: Constraints,
  slots: string[][],
  tier: "full" | "light" | "minimum",
  rand: () => number,
  avoid: Set<string>,
): PlannedItem[] {
  const chosen: PlannedItem[] = [];
  const used = new Set<string>();

  for (const slot of slots) {
    let candidates: Exercise[] = [];
    for (const pattern of slot) {
      const inPattern = pool.filter(
        (e) => e.movement_pattern === pattern && !used.has(e.slug),
      );
      // Engine swaps (skipped twice / reduced twice) route around a slug —
      // but never at the cost of emptying the slot entirely.
      const withoutAvoided = inPattern.filter((e) => !avoid.has(e.slug));
      candidates = withoutAvoided.length > 0 ? withoutAvoided : inPattern;
      if (candidates.length > 0) break;
    }
    if (candidates.length === 0) continue; // constraint closed this slot; skip quietly

    // Prefer the tier's own intensity, then fall through.
    let ranked: Exercise[] = [];
    for (const t of TIER_PREFERENCE[tier]) {
      ranked = candidates.filter((e) => e.intensity_tier === t);
      if (ranked.length > 0) break;
    }
    if (ranked.length === 0) ranked = candidates;

    // Prefer exercises that don't touch easing regions.
    const calm = ranked.filter((e) => !loadsEasingRegion(e, c));
    const pickFrom = calm.length > 0 ? calm : ranked;

    const exercise = pickFrom[Math.floor(rand() * pickFrom.length)];
    used.add(exercise.slug);

    const eased = loadsEasingRegion(exercise, c);
    const d = dose(exercise, tier);
    chosen.push({
      exercise,
      dose: d.text,
      sets: d.sets,
      note: eased ? "keep this one gentle" : undefined,
    });
  }
  return chosen;
}

export function generatePlan(
  c: Constraints,
  dateISO: string,
  pool: Exercise[] = fullPool,
  avoidSlugs: Set<string> = new Set(),
): DayPlan {
  const allowed = filterPool(pool, c);
  const rand = mulberry32(
    seedFrom(dateISO + JSON.stringify({ ...c, updatedAt: "" })),
  );

  const notes: string[] = [];
  const suppressed = Object.entries(c.regions)
    .filter(([, s]) => s === "suppressed")
    .map(([r]) => REGION_LABELS[r] ?? r);
  if (suppressed.length > 0) {
    notes.push(
      `Nothing today loads: ${suppressed.join(", ").toLowerCase()}.`,
    );
  }

  return {
    date: dateISO,
    full: pickForTier(allowed, c, FULL_SLOTS, "full", rand, avoidSlugs),
    light: pickForTier(allowed, c, LIGHT_SLOTS, "light", rand, avoidSlugs),
    minimum: pickForTier(allowed, c, MINIMUM_SLOTS, "minimum", rand, avoidSlugs),
    notes,
  };
}
