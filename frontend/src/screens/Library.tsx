import { useMemo, useState } from "react";
import { ExerciseFigure } from "../components/ExerciseFigure";
import {
  exercises,
  FLAG_LABELS,
  PATTERN_LABELS,
  vocabulary,
  type Exercise,
} from "../lib/library";

/**
 * Admin view of the exercise library: browse, search, and filter the seed
 * pool with the same dimensions the plan generator filters on. Its job is
 * QA — making gaps in coverage visible before the engine ever runs.
 */
export function Library() {
  const [query, setQuery] = useState("");
  const [pattern, setPattern] = useState<string | null>(null);
  const [position, setPosition] = useState<string | null>(null);
  const [chairOnly, setChairOnly] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return exercises.filter(
      (e) =>
        (!pattern || e.movement_pattern === pattern) &&
        (!position || e.position === position) &&
        (!chairOnly || e.wheelchair_ok) &&
        (!q || e.name.toLowerCase().includes(q) || e.slug.includes(q)),
    );
  }, [query, pattern, position, chairOnly]);

  const patternCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const e of exercises)
      counts[e.movement_pattern] = (counts[e.movement_pattern] ?? 0) + 1;
    return counts;
  }, []);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-5 px-5 pb-28 pt-8">
      <header className="animate-rise">
        <p className="text-xs font-medium uppercase tracking-wide text-ink/40">
          Every exercise, tagged
        </p>
        <h1 className="font-display mt-0.5 text-[1.75rem] font-semibold leading-tight">
          Library
        </h1>
      </header>

      <p className="animate-rise text-sm text-ink/60 [animation-delay:60ms]">
        <span className="font-data">{exercises.length}</span> exercises ·{" "}
        <span className="font-data">{results.length}</span> shown
      </p>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by name"
        className="animate-rise w-full rounded-xl border border-mist bg-card px-4 py-3 text-base outline-none [animation-delay:120ms] focus:border-moss"
        aria-label="Search exercises"
      />

      <div
        className="animate-rise -mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [animation-delay:180ms]"
        role="group"
        aria-label="Filter by movement pattern"
      >
        {vocabulary.movement_pattern.map((p) => (
          <button
            key={p}
            onClick={() => setPattern(pattern === p ? null : p)}
            className={`shrink-0 rounded-full border px-3.5 py-2 text-sm transition-colors ${
              pattern === p
                ? "border-moss bg-moss text-paper"
                : "border-mist bg-card text-ink/70"
            }`}
          >
            {PATTERN_LABELS[p] ?? p}{" "}
            <span className="font-data opacity-60">{patternCounts[p] ?? 0}</span>
          </button>
        ))}
      </div>

      <div
        className="animate-rise -mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [animation-delay:220ms]"
        role="group"
        aria-label="Filter by position"
      >
        {vocabulary.position.map((p) => (
          <button
            key={p}
            onClick={() => setPosition(position === p ? null : p)}
            className={`shrink-0 rounded-full border px-3.5 py-2 text-sm capitalize transition-colors ${
              position === p
                ? "border-periwinkle bg-periwinkle text-paper"
                : "border-mist bg-card text-ink/70"
            }`}
          >
            {p}
          </button>
        ))}
        <button
          onClick={() => setChairOnly(!chairOnly)}
          className={`shrink-0 rounded-full border px-3.5 py-2 text-sm transition-colors ${
            chairOnly
              ? "border-periwinkle bg-periwinkle text-paper"
              : "border-mist bg-card text-ink/70"
          }`}
        >
          chair-friendly
        </button>
      </div>

      <ul className="space-y-2.5">
        {results.map((e) => (
          <ExerciseCard
            key={e.slug}
            exercise={e}
            open={open === e.slug}
            onToggle={() => setOpen(open === e.slug ? null : e.slug)}
          />
        ))}
        {results.length === 0 && (
          <li className="rounded-2xl border border-dashed border-mist p-6 text-center text-sm text-ink/60">
            Nothing matches those filters yet — try widening one.
          </li>
        )}
      </ul>
    </main>
  );
}

function ExerciseCard({
  exercise: e,
  open,
  onToggle,
}: {
  exercise: Exercise;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <li className="rounded-2xl border border-mist bg-card">
      <button
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 p-4 text-left"
      >
        <span className="flex items-center gap-3">
          <ExerciseFigure exercise={e} />
          <span>
            <span className="block font-medium">{e.name}</span>
            <span className="mt-0.5 block text-xs text-ink/50">
              {PATTERN_LABELS[e.movement_pattern]} · {e.position} · {e.equipment}
              {e.wheelchair_ok && " · chair-friendly"}
            </span>
          </span>
        </span>
        <span className="font-data shrink-0 rounded-full bg-mist px-2.5 py-1 text-xs text-ink/70">
          {e.intensity_tier}
        </span>
      </button>
      {open && (
        <div className="space-y-2 border-t border-mist p-4 text-sm">
          <p className="text-ink/80">{e.cue}</p>
          <p className="font-data text-xs text-ink/50">
            impact {e.impact_level}
            {e.axial_load && " · axial load"}
            {e.joints_loaded.length > 0 && ` · loads ${e.joints_loaded.join(", ")}`}
          </p>
          {Object.keys(e.rom_demand).length > 0 && (
            <p className="font-data text-xs text-ink/50">
              needs{" "}
              {Object.entries(e.rom_demand)
                .map(([j, d]) => `${j} ${d}°`)
                .join(", ")}
            </p>
          )}
          {e.flags.length > 0 && (
            <p className="flex flex-wrap gap-1.5">
              {e.flags.map((f) => (
                <span
                  key={f}
                  className="rounded-full bg-ochre/15 px-2.5 py-1 text-xs text-ochre"
                >
                  {FLAG_LABELS[f] ?? f}
                </span>
              ))}
            </p>
          )}
        </div>
      )}
    </li>
  );
}
