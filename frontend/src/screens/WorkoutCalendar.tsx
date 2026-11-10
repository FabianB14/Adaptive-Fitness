import { useState } from "react";
import {
  monthDays,
  monthSummary,
  SESSION_LABELS,
  shiftMonth,
} from "../lib/calendar";
import { exercises } from "../lib/library";
import { loadLogs, type SessionLog } from "../lib/logs";
import { loadProfile } from "../lib/nutrition";
import { displayWeight, weightUnit, type UnitSystem } from "../lib/units";
import { localDateISO } from "../lib/weekly";

const dateLabel = (date: string) =>
  new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

export function WorkoutCalendar() {
  const today = localDateISO();
  const [selected, setSelected] = useState(today);
  const [logs] = useState(loadLogs);
  const units = loadProfile()?.units ?? "metric";
  const days = monthDays(selected);
  const summary = monthSummary(logs, selected);
  const entry = logs.find((log) => log.date === selected);
  const monthLabel = new Date(`${selected}T12:00:00`).toLocaleDateString(
    undefined,
    {
      month: "long",
      year: "numeric",
    },
  );

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-5 px-5 pb-28 pt-8">
      <header>
        <a href="#/progress" className="text-sm text-moss">
          ← Progress
        </a>
        <p className="mt-5 text-xs uppercase tracking-wide text-ink/60">
          Your movement history
        </p>
        <h1 className="font-display mt-1 text-3xl font-semibold">
          Workout calendar
        </h1>
        <p className="mt-2 text-sm text-ink/70">
          Tap a day to see the workout you logged and the sets you tracked.
        </p>
      </header>

      <section
        aria-label="Workout history calendar"
        className="rounded-3xl border border-mist bg-card p-3 shadow-sm"
      >
        <div className="flex items-center justify-between gap-2">
          <button
            aria-label="Previous month"
            onClick={() => setSelected(shiftMonth(selected, -1))}
            className="h-11 w-11 rounded-full border border-mist text-xl text-moss"
          >
            ←
          </button>
          <h2
            aria-live="polite"
            className="font-display text-center text-lg font-semibold"
          >
            {monthLabel}
          </h2>
          <button
            aria-label="Next month"
            onClick={() => setSelected(shiftMonth(selected, 1))}
            className="h-11 w-11 rounded-full border border-mist text-xl text-moss"
          >
            →
          </button>
        </div>
        <div className="mt-3 grid grid-cols-7 text-center" aria-hidden="true">
          {["M", "T", "W", "T", "F", "S", "S"].map((day, index) => (
            <span key={index} className="py-2 text-xs text-ink/65">
              {day}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((date, index) => {
            if (!date) return <span key={`empty-${index}`} />;
            const log = logs.find((item) => item.date === date);
            const active = date === selected;
            return (
              <button
                key={date}
                aria-label={`${dateLabel(date)}${date === today ? ", Today" : ""}, ${log ? SESSION_LABELS[log.tier] : "No entry"}`}
                aria-pressed={active}
                aria-current={date === today ? "date" : undefined}
                onClick={() => setSelected(date)}
                className={`flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-xl border text-sm ${active ? "border-moss bg-moss text-paper" : date === today ? "border-moss bg-moss/5 text-ink" : "border-transparent text-ink hover:bg-moss/10"}`}
              >
                <span className="font-data">{Number(date.slice(8))}</span>
                <span
                  aria-hidden="true"
                  className={`h-4 text-xs ${active ? "text-paper" : log?.tier === "rest" ? "text-periwinkle" : "text-moss"}`}
                >
                  {log ? (log.tier === "rest" ? "☾" : "✓") : ""}
                </span>
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-mist pt-3 text-xs">
          <p className="text-ink/70">
            <span className="text-moss">✓</span> Workout{" "}
            <span className="ml-3 text-periwinkle">☾</span> Rest
          </p>
          <button
            onClick={() => setSelected(today)}
            className="min-h-10 px-2 font-medium text-moss"
          >
            Go to today
          </button>
        </div>
      </section>

      <div className="grid grid-cols-3 gap-2" aria-label="Month totals">
        {[
          { value: summary.workouts, label: "Workouts" },
          { value: summary.rest, label: "Rest days" },
          { value: summary.sets, label: "Tracked sets" },
        ].map(({ value, label }) => (
          <div
            key={label}
            className="rounded-2xl border border-mist bg-card px-2 py-3 text-center"
          >
            <p className="font-data text-xl font-medium text-moss">{value}</p>
            <p className="mt-1 text-xs text-ink/70">{label}</p>
          </div>
        ))}
      </div>

      <section
        aria-label="Selected day"
        aria-live="polite"
        className="rounded-3xl border border-mist bg-card p-5"
      >
        <h2 className="font-display text-lg font-semibold">
          {dateLabel(selected)}
        </h2>
        {entry ? (
          <WorkoutDetails log={entry} units={units} />
        ) : (
          <>
            <p className="mt-3 text-sm text-ink/70">
              {selected > today
                ? "Your workout will appear here after you log it."
                : "No workout or rest entry for this day."}
            </p>
            <a
              href={selected === today ? "#/" : "#/plan"}
              className="mt-3 inline-block text-sm text-moss underline"
            >
              {selected === today
                ? "Open today's workout"
                : "See your weekly plan"}
            </a>
          </>
        )}
      </section>
      <p className="px-1 text-xs text-ink/65">
        History comes from entries saved on this device. A blank day means no
        entry was saved.
      </p>
    </main>
  );
}

function WorkoutDetails({
  log,
  units,
}: {
  log: SessionLog;
  units: UnitSystem;
}) {
  const tracked = log.exercises && log.exercises.length > 0;
  return (
    <>
      <div className="mt-3 flex flex-wrap gap-2">
        <span className="rounded-full bg-moss/10 px-3 py-1 text-sm font-medium text-moss">
          {SESSION_LABELS[log.tier]}
        </span>
        {log.workout?.location && (
          <span className="rounded-full bg-periwinkle/10 px-3 py-1 text-sm text-periwinkle">
            {log.workout.location === "gym" ? "Gym" : "Home"}
          </span>
        )}
      </div>
      {log.rpe != null && (
        <p className="mt-3 text-sm text-ink/70">Session effort: {log.rpe}/10</p>
      )}
      {log.tier === "rest" ? (
        <p className="mt-3 text-sm text-ink/70">
          You logged a rest day. Recovery is part of your week.
        </p>
      ) : tracked ? (
        <ul className="mt-4 divide-y divide-mist">
          {log.exercises!.map((item, index) => {
            const saved = log.workout?.exercises.find(
              (e) => e.slug === item.slug,
            );
            const name =
              saved?.name ??
              exercises.find((e) => e.slug === item.slug)?.name ??
              item.slug.replace(/[-_]/g, " ");
            return (
              <li
                key={`${item.slug}-${index}`}
                className="py-3 first:pt-0 last:pb-0"
              >
                <h3 className="font-medium">{name}</h3>
                <p className="mt-1 text-sm text-ink/75">
                  {item.setsDone === 0 ? "Not completed · " : ""}
                  {item.setsDone} of {item.setsPlanned} sets completed
                  {item.setsDone > 0 && item.loadKg != null
                    ? ` · ${displayWeight(item.loadKg, units)} ${weightUnit(units)}`
                    : ""}
                </p>
                {saved?.dose && (
                  <p className="mt-1 text-xs text-ink/65">
                    Planned: {saved.dose}
                  </p>
                )}
                {item.setsDone > 0 && item.rpe != null && (
                  <p className="mt-1 text-xs text-ink/65">
                    Effort: {item.rpe}/10
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <>
          <p className="mt-3 text-sm text-ink/70">
            Quick log — individual sets weren't tracked.
          </p>
          {log.workout?.exercises.length ? (
            <>
              <h3 className="mt-4 text-sm font-medium">
                Planned movements for this entry
              </h3>
              <ul className="mt-2 space-y-3">
                {log.workout.exercises.map((item, index) => (
                  <li key={`${item.slug}-${index}`} className="text-sm">
                    <p>{item.name}</p>
                    <p className="mt-1 text-xs text-ink/65">
                      Planned: {item.dose}
                    </p>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="mt-2 text-sm text-ink/70">
              Exercise details weren't recorded for this entry.
            </p>
          )}
        </>
      )}
    </>
  );
}
