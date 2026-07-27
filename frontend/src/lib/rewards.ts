/**
 * The sticker shelf — goal rewards as stars and small celebrations.
 *
 * Design rules: rewards only ever ADD. There are no broken streak marks,
 * no grayed-out shame states, no "you lost your star." Unearned stickers
 * appear (at most) as gentle invitations with plain progress text.
 * Everything is computed from data — nothing to sync, nothing to lose.
 */

export interface RewardInputs {
  sessionCount: number;
  streakWeeks: number;
  totalCardioMin: number;
  totalSteps: number;
  /** 0–100 toward the weight goal, null when no goal is set. */
  weightPct: number | null;
  /** Best 0–100 across measurement goals, null when none set. */
  measurePct: number | null;
}

export interface Sticker {
  id: string;
  emoji: string;
  name: string;
  earned: boolean;
  /** Invitation text for the next unearned sticker in a track. */
  next?: string;
}

interface Tier {
  id: string;
  emoji: string;
  name: string;
  threshold: number;
  invite: (remaining: number) => string;
}

const SESSION_TIERS: Tier[] = [
  { id: "s1", emoji: "🌱", name: "First step", threshold: 1, invite: () => "log your first session" },
  { id: "s5", emoji: "⭐", name: "Five sessions", threshold: 5, invite: (r) => `${r} more ${r === 1 ? "session" : "sessions"}` },
  { id: "s20", emoji: "🌟", name: "Twenty sessions", threshold: 20, invite: (r) => `${r} to go` },
  { id: "s50", emoji: "🏆", name: "Fifty sessions", threshold: 50, invite: (r) => `${r} to go` },
  { id: "s100", emoji: "👑", name: "One hundred", threshold: 100, invite: (r) => `${r} to go` },
];

const STREAK_TIERS: Tier[] = [
  { id: "w2", emoji: "🔥", name: "Two-week rhythm", threshold: 2, invite: () => "two weeks in a row" },
  { id: "w4", emoji: "🦋", name: "One month strong", threshold: 4, invite: (r) => `${r} more ${r === 1 ? "week" : "weeks"}` },
  { id: "w8", emoji: "🌈", name: "Eight-week habit", threshold: 8, invite: (r) => `${r} more weeks` },
  { id: "w12", emoji: "🌳", name: "A season of showing up", threshold: 12, invite: (r) => `${r} more weeks` },
];

const CARDIO_TIERS: Tier[] = [
  { id: "c60", emoji: "🚶", name: "First hour moved", threshold: 60, invite: (r) => `${r} more minutes` },
  { id: "c300", emoji: "🐝", name: "Five hours moved", threshold: 300, invite: (r) => `${r} more minutes` },
  { id: "c1000", emoji: "🎒", name: "A thousand minutes", threshold: 1000, invite: (r) => `${r} to go` },
];

const STEP_TIERS: Tier[] = [
  { id: "k100", emoji: "👟", name: "100k steps", threshold: 100_000, invite: (r) => `${Math.ceil(r / 1000)}k steps to go` },
  { id: "k500", emoji: "🐾", name: "Half a million steps", threshold: 500_000, invite: (r) => `${Math.ceil(r / 1000)}k to go` },
  { id: "k1000", emoji: "🚀", name: "One million steps", threshold: 1_000_000, invite: (r) => `${Math.ceil(r / 1000)}k to go` },
];

const WEIGHT_TIERS: Tier[] = [
  { id: "wp25", emoji: "⭐", name: "A quarter of the way", threshold: 25, invite: () => "keep going — the trend is what counts" },
  { id: "wp50", emoji: "🌟", name: "Halfway there", threshold: 50, invite: () => "" },
  { id: "wp75", emoji: "💫", name: "Three quarters", threshold: 75, invite: () => "" },
  { id: "wp100", emoji: "🏆", name: "Weight goal reached", threshold: 100, invite: () => "" },
];

const MEASURE_TIERS: Tier[] = [
  { id: "mp25", emoji: "🌸", name: "Measurements: 25%", threshold: 25, invite: () => "" },
  { id: "mp50", emoji: "🌺", name: "Measurements: halfway", threshold: 50, invite: () => "" },
  { id: "mp75", emoji: "🌻", name: "Measurements: 75%", threshold: 75, invite: () => "" },
  { id: "mp100", emoji: "👑", name: "Measurement goal reached", threshold: 100, invite: () => "" },
];

function evalTrack(tiers: Tier[], value: number | null): Sticker[] {
  if (value === null) return [];
  const out: Sticker[] = [];
  let invited = false;
  for (const t of tiers) {
    const earned = value >= t.threshold;
    if (earned) {
      out.push({ id: t.id, emoji: t.emoji, name: t.name, earned: true });
    } else if (!invited) {
      // Only the NEXT sticker shows as an invitation — never a wall of locks.
      const text = t.invite(Math.ceil(t.threshold - value));
      out.push({ id: t.id, emoji: t.emoji, name: t.name, earned: false, next: text || undefined });
      invited = true;
    }
  }
  return out;
}

export function computeStickers(inputs: RewardInputs): Sticker[] {
  return [
    ...evalTrack(SESSION_TIERS, inputs.sessionCount),
    ...evalTrack(STREAK_TIERS, inputs.streakWeeks),
    ...evalTrack(CARDIO_TIERS, inputs.totalCardioMin),
    ...evalTrack(STEP_TIERS, inputs.totalSteps),
    ...evalTrack(WEIGHT_TIERS, inputs.weightPct),
    ...evalTrack(MEASURE_TIERS, inputs.measurePct),
  ];
}

export function earnedCount(stickers: Sticker[]): number {
  return stickers.filter((s) => s.earned).length;
}
