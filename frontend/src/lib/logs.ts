/**
 * Session + pain-event logs. localStorage now; becomes the offline write
 * queue when the backend lands (every entry already carries a client id
 * and timestamp so replays are idempotent).
 */
export type TierChoice = "full" | "light" | "minimum" | "rest";

export interface SessionLog {
  id: string;
  date: string; // YYYY-MM-DD, local
  tier: TierChoice;
  /** Session RPE 1–10. Absent for rest days or when the user skips the question. */
  rpe?: number;
  loggedAt: string;
}

export interface PainEvent {
  id: string;
  date: string;
  region: string;
}

const LOGS_KEY = "af.logs.v1";
const PAIN_KEY = "af.pain.v1";

function read<T>(key: string): T[] {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "[]") as T[];
  } catch {
    return [];
  }
}

function write<T>(key: string, items: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(items));
  } catch {
    // Storage unavailable — in-memory state still drives the session.
  }
}

export function loadLogs(): SessionLog[] {
  return read<SessionLog>(LOGS_KEY);
}

export function addLog(date: string, tier: TierChoice, rpe?: number): SessionLog[] {
  const logs = loadLogs().filter((l) => l.date !== date); // one log per day
  logs.push({
    id: crypto.randomUUID(),
    date,
    tier,
    rpe,
    loggedAt: new Date().toISOString(),
  });
  logs.sort((a, b) => a.date.localeCompare(b.date));
  write(LOGS_KEY, logs);
  return logs;
}

export function removeLog(date: string): SessionLog[] {
  const logs = loadLogs().filter((l) => l.date !== date);
  write(LOGS_KEY, logs);
  return logs;
}

export function loadPainEvents(): PainEvent[] {
  return read<PainEvent>(PAIN_KEY);
}

export function addPainEvent(date: string, region: string): PainEvent[] {
  const events = loadPainEvents();
  events.push({ id: crypto.randomUUID(), date, region });
  write(PAIN_KEY, events);
  return events;
}
