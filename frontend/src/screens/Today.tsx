import { useEffect, useMemo, useState } from "react";
import { ReadinessMap } from "../components/ReadinessMap";
import { loadConstraints, REGION_LABELS } from "../lib/constraints";
import { daySignals, effectiveConstraints } from "../lib/engine";
import { API_BASE } from "../lib/env";
import { addLog, addPainEvent, loadLogs, loadPainEvents, removeLog, type PainEvent, type SessionLog, type TierChoice } from "../lib/logs";
import { loadProfile } from "../lib/nutrition";
import { generatePlan, type PlannedItem } from "../lib/planner";
import { loadStates, slugsToAvoid } from "../lib/progress";
import {
  isFirebaseConfigured,
  signIn,
  signOutUser,
  watchAuth,
  type User,
} from "../lib/firebase";

type TierKey = "full" | "light" | "minimum";

const TIERS: { key: TierKey; name: string; desc: string; accent: string; chip: string }[] = [
  { key: "full", name: "Full", desc: "The programmed session", accent: "bg-moss", chip: "bg-moss/10 text-moss" },
  { key: "light", name: "Light", desc: "Same movements, easier day", accent: "bg-periwinkle", chip: "bg-periwinkle/10 text-periwinkle" },
  { key: "minimum", name: "Minimum", desc: "Five minutes. It counts.", accent: "bg-ochre", chip: "bg-ochre/10 text-ochre" },
];

const TIER_DONE_COPY: Record<TierChoice, string> = {
  full: "Full day logged",
  light: "Light day logged",
  minimum: "Minimum day logged",
  rest: "Rest day logged",
};

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * The dashboard. Readiness draws in, stats settle, then three equal
 * day-cards. Logging is one tap + an optional RPE — the adaptive engine
 * (lib/engine.ts) reads the log history and shapes tomorrow.
 */
export function Today() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(!isFirebaseConfigured);
  const [serverOk, setServerOk] = useState(false);
  const [openTier, setOpenTier] = useState<TierKey | null>(null);
  const [logs, setLogs] = useState<SessionLog[]>(() => loadLogs());
  const [painEvents, setPainEvents] = useState<PainEvent[]>(() => loadPainEvents());
  const [painNote, setPainNote] = useState<string | null>(null);

  const date = todayISO();
  const baseConstraints = useMemo(() => loadConstraints(), []);
  const constraints = useMemo(
    () => effectiveConstraints(baseConstraints, painEvents, date),
    [baseConstraints, painEvents, date],
  );
  const plan = useMemo(
    () =>
      generatePlan(
        constraints,
        date,
        undefined,
        slugsToAvoid(loadStates()),
        loadProfile()?.goals ?? [],
      ),
    [constraints, date],
  );
  const signals = useMemo(() => daySignals(logs, date), [logs, date]);
  const todayLog = logs.find((l) => l.date === date);

  useEffect(() => watchAuth((u) => (setUser(u), setAuthReady(true))), []);
  useEffect(() => {
    if (!API_BASE) return;
    fetch(`${API_BASE}/health`)
      .then((r) => setServerOk(r.ok))
      .catch(() => setServerOk(false));
  }, []);

  const dateLabel = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-5 px-5 pb-28 pt-8">
      <header className="animate-rise flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-ink/40">
            {dateLabel}
          </p>
          <h1 className="font-display mt-0.5 text-[1.75rem] font-semibold leading-tight">
            Today
          </h1>
        </div>
        {authReady &&
          (user ? (
            <button
              onClick={signOutUser}
              className="mt-1 text-sm text-ink/50 underline-offset-2 hover:underline"
            >
              Sign out
            </button>
          ) : isFirebaseConfigured ? (
            <button
              onClick={() => signIn().catch(() => {})}
              className="mt-1 rounded-full bg-moss px-4 py-2 text-sm font-medium text-paper transition-transform active:scale-[0.97]"
            >
              Sign in
            </button>
          ) : null)}
      </header>

      {/* Stat tiles */}
      <section className="animate-rise grid grid-cols-3 gap-2.5 [animation-delay:80ms]" aria-label="Your week">
        <StatTile value={String(signals.streakWeeks)} unit={signals.streakWeeks === 1 ? "week" : "weeks"} label="streak" />
        <StatTile value={String(signals.sessionsThisWeek)} unit={signals.sessionsThisWeek === 1 ? "session" : "sessions"} label="this week" />
        <StatTile value={String(plan.full.length + plan.light.length + plan.minimum.length)} unit="items" label="planned" />
      </section>

      {/* Engine banners — calm, factual, never about what was missed */}
      {signals.gapReturn && !todayLog && (
        <Banner tone="periwinkle">
          Welcome back. Today runs at 70% — that's the plan working, not a
          penalty.
        </Banner>
      )}
      {signals.deload && !signals.gapReturn && (
        <Banner tone="periwinkle">
          Deload week: lighter on purpose after three strong weeks.
        </Banner>
      )}
      {plan.notes.map((n) => (
        <Banner key={n} tone="mist">
          {n}
        </Banner>
      ))}

      {/* Readiness card */}
      <section className="animate-rise rounded-3xl border border-mist bg-card p-5 shadow-sm [animation-delay:160ms]">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-base font-semibold">Readiness</h2>
          <a href="#/constraints" className="text-sm text-moss underline-offset-2 hover:underline">
            Adjust
          </a>
        </div>
        <div className="mt-2">
          <ReadinessMap
            constraints={constraints}
            onReportPain={(region) => {
              setPainEvents(addPainEvent(date, region));
              setPainNote(
                `${REGION_LABELS[region] ?? region} gets a week off. Today's plan already works around it.`,
              );
            }}
          />
        </div>
        {painNote && (
          <p className="mt-3 rounded-2xl bg-ochre/10 px-4 py-3 text-center text-sm text-ochre">
            {painNote}
          </p>
        )}
      </section>

      {/* The three-tier day */}
      <section className="space-y-2.5" aria-label="Choose today's session">
        <h2 className="animate-rise font-display px-1 text-base font-semibold [animation-delay:400ms]">
          {todayLog ? "Done for today" : "Pick your day"}
        </h2>

        {todayLog ? (
          <div className="animate-rise rounded-3xl border border-moss/30 bg-moss/5 p-5 [animation-delay:460ms]">
            <p className="font-display text-lg font-semibold text-moss">
              {TIER_DONE_COPY[todayLog.tier]}
            </p>
            <p className="mt-1 text-sm text-ink/60">
              {todayLog.rpe
                ? `Effort ${todayLog.rpe}/10 — tomorrow adapts to it.`
                : todayLog.tier === "rest"
                  ? "Chosen rest keeps everything on track."
                  : "Nice work. Tomorrow builds on it."}
            </p>
            <button
              onClick={() => setLogs(removeLog(date))}
              className="mt-3 text-xs text-ink/50 underline-offset-2 hover:underline"
            >
              Change today's entry
            </button>
          </div>
        ) : (
          <>
            {TIERS.map((t, i) => (
              <TierCard
                key={t.key}
                tier={t}
                items={plan[t.key]}
                open={openTier === t.key}
                onToggle={() => setOpenTier(openTier === t.key ? null : t.key)}
                onLog={(rpe) => setLogs(addLog(date, t.key, rpe))}
                delay={460 + i * 100}
              />
            ))}
            <button
              onClick={() => setLogs(addLog(date, "rest"))}
              className="animate-rise w-full rounded-3xl border border-dashed border-mist p-4 text-sm text-ink/60 transition-transform active:scale-[0.985] [animation-delay:760ms]"
            >
              Resting today — that's a choice, and it counts too
            </button>
          </>
        )}
      </section>

      <footer className="mt-2 flex items-center justify-between text-xs text-ink/35">
        <span className="font-data">v0.7.0</span>
        <span className="font-data">{serverOk ? "server: connected" : "on-device plan"}</span>
      </footer>
    </main>
  );
}

function StatTile({ value, unit, label }: { value: string; unit: string; label: string }) {
  return (
    <div className="rounded-2xl border border-mist bg-card px-3 py-3.5 text-center shadow-sm">
      <p className="font-data text-2xl font-medium leading-none">{value}</p>
      <p className="mt-1.5 text-[11px] leading-tight text-ink/45">
        {unit}
        <br />
        {label}
      </p>
    </div>
  );
}

function Banner({ children, tone }: { children: React.ReactNode; tone: "periwinkle" | "mist" }) {
  return (
    <p
      className={`animate-rise rounded-2xl px-4 py-3 text-center text-sm [animation-delay:120ms] ${
        tone === "periwinkle" ? "bg-periwinkle/10 text-periwinkle" : "bg-mist/50 text-ink/70"
      }`}
    >
      {children}
    </p>
  );
}

const RPE_OPTIONS = [5, 6, 7, 8, 9, 10];

function TierCard({
  tier,
  items,
  open,
  onToggle,
  onLog,
  delay,
}: {
  tier: (typeof TIERS)[number];
  items: PlannedItem[];
  open: boolean;
  onToggle: () => void;
  onLog: (rpe?: number) => void;
  delay: number;
}) {
  const [asking, setAsking] = useState(false);

  return (
    <div
      className="animate-rise rounded-3xl border border-mist bg-card shadow-sm"
      style={{ animationDelay: `${delay}ms` }}
    >
      <button
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-4 p-5 text-left transition-transform active:scale-[0.99]"
      >
        <span className={`h-11 w-1.5 shrink-0 rounded-full ${tier.accent}`} />
        <span className="flex-1">
          <span className="font-display block text-lg font-semibold">{tier.name}</span>
          <span className="block text-sm text-ink/55">{tier.desc}</span>
        </span>
        <span className={`font-data shrink-0 rounded-full px-2.5 py-1 text-xs ${tier.chip}`}>
          {items.length} {items.length === 1 ? "item" : "items"}
        </span>
      </button>

      {open && (
        <div className="border-t border-mist p-5 pt-4">
          <ul className="space-y-3">
            {items.map(({ exercise, dose, note }) => (
              <li key={exercise.slug} className="flex items-start justify-between gap-3">
                <span>
                  <span className="block text-sm font-medium">{exercise.name}</span>
                  <span className="block text-xs text-ink/50">{exercise.cue}</span>
                  {note && <span className="mt-0.5 block text-xs text-ochre">{note}</span>}
                </span>
                <span className="font-data shrink-0 text-sm text-ink/70">{dose}</span>
              </li>
            ))}
            {items.length === 0 && (
              <li className="text-sm text-ink/60">
                Your current limits close out this tier for today — the others
                are ready when you are.
              </li>
            )}
          </ul>

          {items.length > 0 && !asking && (
            <div className="mt-4 space-y-2">
              <a
                href={`#/session/${tier.key}`}
                className="block w-full rounded-xl bg-moss px-5 py-3 text-center font-medium text-paper transition-transform active:scale-[0.98]"
              >
                Start {tier.name.toLowerCase()} session
              </a>
              <button
                onClick={() => setAsking(true)}
                className="w-full py-1 text-center text-xs text-ink/50 underline-offset-2 hover:underline"
              >
                or log the day without tracking sets
              </button>
            </div>
          )}

          {asking && (
            <div className="mt-4 space-y-2.5">
              <p className="text-sm text-ink/70">How hard did it feel, 5–10?</p>
              <div className="flex gap-1.5">
                {RPE_OPTIONS.map((r) => (
                  <button
                    key={r}
                    onClick={() => onLog(r)}
                    className="font-data flex-1 rounded-xl border border-mist bg-paper py-3 text-sm transition-colors hover:border-moss active:bg-moss active:text-paper"
                  >
                    {r}
                  </button>
                ))}
              </div>
              <button
                onClick={() => onLog(undefined)}
                className="w-full py-1 text-center text-xs text-ink/50 underline-offset-2 hover:underline"
              >
                Skip the question — still counts
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
