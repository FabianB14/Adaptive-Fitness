import { useMemo, useState } from "react";
import { ShareCard } from "../components/ShareCard";
import { daySignals } from "../lib/engine";
import { loadLogs } from "../lib/logs";
import {
  addActivity,
  addMeasurement,
  addWeight,
  clampWeightGoal,
  latestMeasurement,
  lifetimeTotals,
  loadGoals,
  loadMetrics,
  MEASUREMENT_TYPES,
  minHealthyWeightKg,
  progressPct,
  saveGoals,
  weeklyTargets,
  weekTotals,
  weightTrend,
  type GoalsStore,
  type MetricsStore,
} from "../lib/metrics";
import { loadProfile, saveProfile } from "../lib/nutrition";
import { computeStickers, earnedCount } from "../lib/rewards";
import {
  displayLength,
  displayWeight,
  lengthUnit,
  parseLength,
  parseWeight,
  weightUnit,
  type UnitSystem,
} from "../lib/units";

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Progress — starting point, where you are, where you're headed. Weight and
 * measurements each carry a start → goal range with a safety floor; cardio,
 * steps, and session history feed the sticker shelf. Rewards only ever add:
 * there is no losing a star, no broken-streak mark, no gray shame state.
 */
export function ProgressScreen() {
  const [metrics, setMetrics] = useState<MetricsStore>(() => loadMetrics());
  const [goals, setGoals] = useState<GoalsStore>(() => loadGoals());
  const profile = loadProfile();
  const units: UnitSystem = profile?.units ?? "metric";
  const date = todayISO();

  const trend = weightTrend(metrics.weights, date);
  const week = weekTotals(metrics.activity, date);
  const life = lifetimeTotals(metrics.activity);
  const targets = weeklyTargets(profile?.activity);
  const logs = useMemo(() => loadLogs(), []);
  const sessionCount = logs.filter((l) => l.tier !== "rest").length;
  const signals = useMemo(() => daySignals(logs, date), [logs, date]);

  const weightPct = goals.weight
    ? progressPct(goals.weight.start, trend ?? goals.weight.start, goals.weight.goal)
    : null;

  const measurePcts = MEASUREMENT_TYPES.map((t) => {
    const g = goals.measurements[t.id];
    const latest = latestMeasurement(metrics.measurements, t.id);
    return g ? progressPct(g.start, latest?.cm ?? g.start, g.goal) : null;
  }).filter((p): p is number => p !== null);
  const measurePct = measurePcts.length > 0 ? Math.max(...measurePcts) : null;

  const stickers = computeStickers({
    sessionCount,
    streakWeeks: signals.streakWeeks,
    totalCardioMin: life.cardioMin,
    totalSteps: life.steps,
    weightPct,
    measurePct,
  });

  function logWeight(kg: number) {
    setMetrics(addWeight(date, kg));
    // The calorie target follows the observed weight, per the brief.
    if (profile) saveProfile({ ...profile, weightKg: kg });
    // First-ever entry becomes the starting weight of an existing goal
    // range that was created before any logging happened.
    if (goals.weight && metrics.weights.length === 0) {
      setGoals(saveGoals({ ...goals, weight: { ...goals.weight, start: kg } }));
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-5 px-5 pb-28 pt-8">
      <header className="animate-rise">
        <p className="text-xs font-medium uppercase tracking-wide text-ink/40">
          Start → today → goal
        </p>
        <h1 className="font-display mt-0.5 text-[1.75rem] font-semibold leading-tight">
          Progress
        </h1>
      </header>

      <StickerShelf stickers={stickers} />

      <WeightCard
        metrics={metrics}
        goals={goals}
        trend={trend}
        heightCm={profile?.heightCm}
        pct={weightPct}
        units={units}
        onLog={logWeight}
        onGoal={(g) => setGoals(saveGoals(g))}
      />

      <MeasurementsCard
        metrics={metrics}
        goals={goals}
        units={units}
        onLog={(type, cm) => {
          setMetrics(addMeasurement(date, type, cm));
          const g = goals.measurements[type];
          if (g && !latestMeasurement(metrics.measurements, type)) {
            setGoals(
              saveGoals({
                ...goals,
                measurements: { ...goals.measurements, [type]: { ...g, start: cm } },
              }),
            );
          }
        }}
        onGoal={(g) => setGoals(saveGoals(g))}
      />

      <MovementCard
        week={week}
        life={life}
        targets={targets}
        onAdd={(steps, cardioMin) => {
          const existing = metrics.activity.find((a) => a.date === date);
          setMetrics(
            addActivity(date, {
              steps: (existing?.steps ?? 0) + steps,
              cardioMin: (existing?.cardioMin ?? 0) + cardioMin,
            }),
          );
        }}
      />

      <ShareCard
        inputs={{
          streakWeeks: signals.streakWeeks,
          sessionCount,
          weekSessions: signals.sessionsThisWeek,
          weekCardioMin: week.cardioMin,
          weekSteps: week.steps,
          stickers,
        }}
      />
    </main>
  );
}

// ------------------------------------------------------------------ stickers

function StickerShelf({ stickers }: { stickers: ReturnType<typeof computeStickers> }) {
  const earned = stickers.filter((s) => s.earned);
  const invites = stickers.filter((s) => !s.earned);
  return (
    <section className="animate-rise rounded-3xl border border-mist bg-card p-5 shadow-sm [animation-delay:80ms]">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-base font-semibold">Sticker shelf</h2>
        <span className="font-data text-xs text-ink/45">
          {earnedCount(stickers)} earned
        </span>
      </div>

      {earned.length > 0 ? (
        <div className="mt-3 grid grid-cols-4 gap-2">
          {earned.map((s) => (
            <div
              key={s.id}
              className="flex flex-col items-center gap-1 rounded-2xl bg-moss/5 px-1 py-2.5 text-center"
              title={s.name}
            >
              <span className="text-2xl leading-none">{s.emoji}</span>
              <span className="text-[10px] leading-tight text-ink/55">{s.name}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-ink/60">
          Your first sticker is one logged session away. 🌱
        </p>
      )}

      {invites.length > 0 && (
        <ul className="mt-3 space-y-1.5 border-t border-mist pt-3">
          {invites.map((s) => (
            <li key={s.id} className="flex items-center gap-2.5 text-sm text-ink/55">
              <span className="text-base opacity-60">{s.emoji}</span>
              <span className="flex-1">{s.name}</span>
              {s.next && <span className="font-data text-xs text-ink/45">{s.next}</span>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// -------------------------------------------------------------------- weight

function WeightCard({
  metrics,
  goals,
  trend,
  heightCm,
  pct,
  units,
  onLog,
  onGoal,
}: {
  metrics: MetricsStore;
  goals: GoalsStore;
  trend: number | null;
  heightCm: number | undefined;
  pct: number | null;
  units: UnitSystem;
  onLog: (kg: number) => void;
  onGoal: (g: GoalsStore) => void;
}) {
  const [entry, setEntry] = useState("");
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState(
    goals.weight ? String(displayWeight(goals.weight.goal, units)) : "",
  );
  const [flooredNote, setFlooredNote] = useState(false);

  const g = goals.weight;
  const unit = weightUnit(units);

  function saveGoal() {
    const rawKg = parseWeight(goalInput, units);
    if (rawKg === null) return;
    let goal = rawKg;
    let floored = false;
    if (heightCm) {
      const clamped = clampWeightGoal(rawKg, heightCm);
      goal = clamped.goalKg;
      floored = clamped.floored;
    }
    const start = trend ?? g?.start ?? goal;
    onGoal({ ...goals, weight: { start, goal } });
    setFlooredNote(floored);
    setGoalInput(String(displayWeight(goal, units)));
    setEditingGoal(false);
  }

  return (
    <section className="animate-rise rounded-3xl border border-mist bg-card p-5 shadow-sm [animation-delay:160ms]">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-base font-semibold">Weight</h2>
        {g && (
          <button
            onClick={() => setEditingGoal(!editingGoal)}
            className="text-sm text-moss underline-offset-2 hover:underline"
          >
            {editingGoal ? "Cancel" : "Edit goal"}
          </button>
        )}
      </div>

      {g ? (
        <>
          <div className="mt-3 flex items-end justify-between">
            <RangePoint label="start" value={displayWeight(g.start, units)} unit={unit} />
            <RangePoint
              label="trend"
              value={trend !== null ? displayWeight(trend, units) : null}
              unit={unit}
              big
            />
            <RangePoint label="goal" value={displayWeight(g.goal, units)} unit={unit} alignEnd />
          </div>
          <ProgressBar pct={pct ?? 0} />
          <p className="mt-1.5 text-xs text-ink/50">
            {pct !== null
              ? `${pct}% of the way — the 7-day trend is what counts, not any single morning.`
              : "Log a weight to see the trend move."}
          </p>
        </>
      ) : (
        <p className="mt-2 text-sm text-ink/60">
          Weight stays optional. If you'd like a goal, set one below — it can
          never go under the healthy floor for your height
          {heightCm
            ? ` (${displayWeight(minHealthyWeightKg(heightCm), units)} ${unit})`
            : ""}.
        </p>
      )}

      {flooredNote && (
        <p className="mt-2 rounded-2xl bg-periwinkle/10 px-4 py-3 text-sm text-periwinkle">
          Held at the lightest healthy weight for your height. That's the
          floor, and it doesn't move.
        </p>
      )}

      {(editingGoal || !g) && (
        <div className="mt-3 flex gap-2">
          <input
            value={goalInput}
            onChange={(e) => setGoalInput(e.target.value.replace(/[^\d.]/g, ""))}
            inputMode="decimal"
            placeholder={`Goal ${unit}`}
            className="font-data w-full flex-1 rounded-xl border border-mist bg-paper px-3 py-3 text-sm outline-none focus:border-moss"
          />
          <button
            onClick={saveGoal}
            disabled={parseWeight(goalInput, units) === null}
            className="rounded-xl bg-moss px-4 py-3 text-sm font-medium text-paper transition-transform active:scale-[0.97] disabled:opacity-40"
          >
            {g ? "Update" : "Set goal"}
          </button>
        </div>
      )}

      <div className="mt-3 flex gap-2 border-t border-mist pt-3">
        <input
          value={entry}
          onChange={(e) => setEntry(e.target.value.replace(/[^\d.]/g, ""))}
          inputMode="decimal"
          placeholder={`Today's weight (${unit})`}
          className="font-data w-full flex-1 rounded-xl border border-mist bg-paper px-3 py-3 text-sm outline-none focus:border-moss"
        />
        <button
          onClick={() => {
            const kg = parseWeight(entry, units);
            if (kg !== null) {
              onLog(kg);
              setEntry("");
            }
          }}
          disabled={parseWeight(entry, units) === null}
          className="rounded-xl border border-moss px-4 py-3 text-sm font-medium text-moss transition-transform active:scale-[0.97] disabled:opacity-40"
        >
          Log
        </button>
      </div>
      {metrics.weights.length > 0 && (
        <p className="mt-2 text-xs text-ink/45">
          {metrics.weights.length}{" "}
          {metrics.weights.length === 1 ? "entry" : "entries"} on file — last on{" "}
          {metrics.weights[metrics.weights.length - 1].date}
        </p>
      )}
    </section>
  );
}

// -------------------------------------------------------------- measurements

function MeasurementsCard({
  metrics,
  goals,
  units,
  onLog,
  onGoal,
}: {
  metrics: MetricsStore;
  goals: GoalsStore;
  units: UnitSystem;
  onLog: (type: string, cm: number) => void;
  onGoal: (g: GoalsStore) => void;
}) {
  const [openType, setOpenType] = useState<string | null>(null);
  const [entry, setEntry] = useState("");
  const [goalInput, setGoalInput] = useState("");
  const unit = lengthUnit(units);

  function open(type: string) {
    if (openType === type) {
      setOpenType(null);
      return;
    }
    setOpenType(type);
    setEntry("");
    setGoalInput(
      goals.measurements[type]
        ? String(displayLength(goals.measurements[type].goal, units))
        : "",
    );
  }

  return (
    <section className="animate-rise rounded-3xl border border-mist bg-card p-5 shadow-sm [animation-delay:240ms]">
      <h2 className="font-display text-base font-semibold">Measurements</h2>
      <p className="mt-1 text-xs text-ink/50">
        A tape measure often moves before the scale does. All optional.
      </p>

      <ul className="mt-3 space-y-2">
        {MEASUREMENT_TYPES.map((t) => {
          const g = goals.measurements[t.id];
          const latest = latestMeasurement(metrics.measurements, t.id);
          const pct = g ? progressPct(g.start, latest?.cm ?? g.start, g.goal) : null;
          const isOpen = openType === t.id;
          return (
            <li key={t.id} className="rounded-2xl border border-mist">
              <button
                onClick={() => open(t.id)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
              >
                <span className="text-sm font-medium">{t.label}</span>
                <span className="font-data text-sm text-ink/60">
                  {latest ? `${displayLength(latest.cm, units)} ${unit}` : "—"}
                  {g && ` → ${displayLength(g.goal, units)} ${unit}`}
                </span>
              </button>
              {g && pct !== null && (
                <div className="px-4 pb-3 -mt-1">
                  <ProgressBar pct={pct} slim />
                </div>
              )}
              {isOpen && (
                <div className="space-y-2 border-t border-mist px-4 py-3">
                  <div className="flex gap-2">
                    <input
                      value={entry}
                      onChange={(e) => setEntry(e.target.value.replace(/[^\d.]/g, ""))}
                      inputMode="decimal"
                      placeholder={`Today's ${t.label.toLowerCase()} (${unit})`}
                      className="font-data w-full flex-1 rounded-xl border border-mist bg-paper px-3 py-2.5 text-sm outline-none focus:border-moss"
                    />
                    <button
                      onClick={() => {
                        const cm = parseLength(entry, units);
                        if (cm !== null) {
                          onLog(t.id, cm);
                          setEntry("");
                        }
                      }}
                      disabled={parseLength(entry, units) === null}
                      className="rounded-xl border border-moss px-4 py-2.5 text-sm font-medium text-moss disabled:opacity-40"
                    >
                      Log
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <input
                      value={goalInput}
                      onChange={(e) =>
                        setGoalInput(e.target.value.replace(/[^\d.]/g, ""))
                      }
                      inputMode="decimal"
                      placeholder={`Goal (${unit})`}
                      className="font-data w-full flex-1 rounded-xl border border-mist bg-paper px-3 py-2.5 text-sm outline-none focus:border-moss"
                    />
                    <button
                      onClick={() => {
                        const goal = parseLength(goalInput, units);
                        if (goal === null) return;
                        const start = latest?.cm ?? g?.start ?? goal;
                        onGoal({
                          ...goals,
                          measurements: {
                            ...goals.measurements,
                            [t.id]: { start, goal },
                          },
                        });
                      }}
                      disabled={parseLength(goalInput, units) === null}
                      className="rounded-xl bg-moss px-4 py-2.5 text-sm font-medium text-paper disabled:opacity-40"
                    >
                      {g ? "Update" : "Set goal"}
                    </button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// ------------------------------------------------------------------ movement

function MovementCard({
  week,
  life,
  targets,
  onAdd,
}: {
  week: { steps: number; cardioMin: number };
  life: { steps: number; cardioMin: number };
  targets: { steps: number; cardioMin: number };
  onAdd: (steps: number, cardioMin: number) => void;
}) {
  const [steps, setSteps] = useState("");
  const [mins, setMins] = useState("");

  return (
    <section className="animate-rise rounded-3xl border border-mist bg-card p-5 shadow-sm [animation-delay:320ms]">
      <h2 className="font-display text-base font-semibold">Movement this week</h2>

      <div className="mt-3 space-y-3">
        <div>
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-ink/60">Steps</span>
            <span className="font-data text-ink/70">
              {week.steps.toLocaleString()}{" "}
              <span className="text-ink/40">/ {targets.steps.toLocaleString()}</span>
            </span>
          </div>
          <ProgressBar pct={Math.min(100, (week.steps / targets.steps) * 100)} slim />
        </div>
        <div>
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-ink/60">Cardio minutes</span>
            <span className="font-data text-ink/70">
              {week.cardioMin}{" "}
              <span className="text-ink/40">/ {targets.cardioMin}</span>
            </span>
          </div>
          <ProgressBar
            pct={Math.min(100, (week.cardioMin / targets.cardioMin) * 100)}
            slim
          />
        </div>
      </div>

      <div className="mt-4 flex gap-2 border-t border-mist pt-3">
        <input
          value={steps}
          onChange={(e) => setSteps(e.target.value.replace(/\D/g, ""))}
          inputMode="numeric"
          placeholder="Steps"
          className="font-data w-full flex-1 rounded-xl border border-mist bg-paper px-3 py-3 text-sm outline-none focus:border-moss"
        />
        <input
          value={mins}
          onChange={(e) => setMins(e.target.value.replace(/\D/g, ""))}
          inputMode="numeric"
          placeholder="Minutes"
          className="font-data w-full flex-1 rounded-xl border border-mist bg-paper px-3 py-3 text-sm outline-none focus:border-moss"
        />
        <button
          onClick={() => {
            const s = Number(steps) || 0;
            const m = Number(mins) || 0;
            if (s > 0 || m > 0) {
              onAdd(s, m);
              setSteps("");
              setMins("");
            }
          }}
          disabled={!Number(steps) && !Number(mins)}
          className="rounded-xl bg-moss px-4 py-3 text-sm font-medium text-paper transition-transform active:scale-[0.97] disabled:opacity-40"
        >
          Add
        </button>
      </div>
      <p className="mt-2 text-xs text-ink/45">
        Adds to today — walks, wheels, dancing in the kitchen, it all counts.
      </p>

      <p className="mt-3 border-t border-mist pt-3 text-xs text-ink/50">
        All time: <span className="font-data">{life.steps.toLocaleString()}</span>{" "}
        steps · <span className="font-data">{life.cardioMin.toLocaleString()}</span>{" "}
        cardio minutes
      </p>
    </section>
  );
}

// -------------------------------------------------------------------- shared

function RangePoint({
  label,
  value,
  unit,
  big,
  alignEnd,
}: {
  label: string;
  value: number | null;
  unit: string;
  big?: boolean;
  alignEnd?: boolean;
}) {
  return (
    <div className={alignEnd ? "text-right" : big ? "text-center" : ""}>
      <p className="text-[11px] uppercase tracking-wide text-ink/40">{label}</p>
      <p className={`font-data ${big ? "text-2xl font-medium" : "text-base"} leading-tight`}>
        {value ?? "—"}
        <span className="ml-0.5 text-xs text-ink/45">{unit}</span>
      </p>
    </div>
  );
}

function ProgressBar({ pct, slim }: { pct: number; slim?: boolean }) {
  return (
    <div
      className={`mt-2 overflow-hidden rounded-full bg-mist/60 ${slim ? "h-1.5" : "h-2.5"}`}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full bg-moss transition-[width] duration-700"
        style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
      />
    </div>
  );
}
