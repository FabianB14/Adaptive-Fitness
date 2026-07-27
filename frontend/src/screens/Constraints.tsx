import { useState } from "react";
import {
  defaultConstraints,
  loadConstraints,
  PATTERN_AVOID_LABELS,
  REGION_LABELS,
  ROM_JOINTS,
  saveConstraints,
  type Constraints,
  type RegionState,
  type RomLevel,
} from "../lib/constraints";
import { filterPool } from "../lib/filter";
import { exercises, vocabulary } from "../lib/library";

const REGION_STATES: { value: RegionState; label: string }[] = [
  { value: "clear", label: "Clear" },
  { value: "easing", label: "Ease" },
  { value: "suppressed", label: "Avoid" },
];

const ROM_LEVELS: { value: RomLevel; label: string }[] = [
  { value: "full", label: "Full" },
  { value: "limited", label: "Limited" },
  { value: "very_limited", label: "Very limited" },
];

const IMPACT_LABELS: Record<string, string> = {
  none: "None",
  low: "Low",
  moderate: "Moderate",
  high: "High",
};

/**
 * Manual constraint entry — the editor for what the app works around.
 * No document required, ever. This same model is what the medical extractor
 * will pre-fill in a later step; the user always has the final word here.
 */
export function ConstraintsScreen() {
  const [c, setC] = useState<Constraints>(() => loadConstraints());

  function update(patch: Partial<Constraints>) {
    setC(saveConstraints({ ...c, ...patch }));
  }

  const poolSize = filterPool(exercises, c).length;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-8 px-5 pb-28 pt-8">
      <header className="animate-rise">
        <p className="text-xs font-medium uppercase tracking-wide text-ink/40">
          The plan works around these
        </p>
        <h1 className="font-display mt-0.5 text-[1.75rem] font-semibold leading-tight">
          Your limits
        </h1>
        <p className="mt-2 text-sm text-ink/60">
          Change anything, anytime — every edit saves itself.
        </p>
      </header>

      <section className="animate-rise space-y-3 [animation-delay:80ms]">
        <h2 className="font-display text-lg font-semibold">Body regions</h2>
        <p className="text-sm text-ink/60">
          Ease keeps loads gentle. Avoid takes the region out of the plan
          entirely.
        </p>
        <ul className="space-y-2">
          {vocabulary.body_region.map((region) => (
            <li
              key={region}
              className="flex items-center justify-between gap-3 rounded-2xl border border-mist bg-white p-3"
            >
              <span className="pl-1 text-sm font-medium">
                {REGION_LABELS[region]}
              </span>
              <Segmented
                options={REGION_STATES}
                value={c.regions[region]}
                onChange={(v) =>
                  update({ regions: { ...c.regions, [region]: v } })
                }
                tone={
                  c.regions[region] === "suppressed"
                    ? "mist"
                    : c.regions[region] === "easing"
                      ? "ochre"
                      : "moss"
                }
              />
            </li>
          ))}
        </ul>
      </section>

      <section className="animate-rise space-y-3 [animation-delay:140ms]">
        <h2 className="font-display text-lg font-semibold">Movements to avoid</h2>
        <div className="flex flex-wrap gap-2">
          {vocabulary.contraindicated_pattern.map((p) => {
            const on = c.avoidPatterns.includes(p);
            return (
              <button
                key={p}
                aria-pressed={on}
                onClick={() =>
                  update({
                    avoidPatterns: on
                      ? c.avoidPatterns.filter((x) => x !== p)
                      : [...c.avoidPatterns, p],
                  })
                }
                className={`rounded-full border px-3.5 py-2.5 text-sm transition-colors ${
                  on
                    ? "border-ochre bg-ochre/15 text-ochre"
                    : "border-mist bg-white text-ink/70"
                }`}
              >
                {PATTERN_AVOID_LABELS[p]}
              </button>
            );
          })}
        </div>
      </section>

      <section className="animate-rise space-y-3 [animation-delay:200ms]">
        <h2 className="font-display text-lg font-semibold">Impact</h2>
        <div className="rounded-2xl border border-mist bg-white p-3">
          <Segmented
            options={vocabulary.impact_level.map((v) => ({
              value: v,
              label: IMPACT_LABELS[v],
            }))}
            value={c.maxImpact}
            onChange={(v) => update({ maxImpact: v })}
            tone="moss"
          />
          <p className="mt-2 pl-1 text-xs text-ink/50">
            Highest impact that feels comfortable.
          </p>
        </div>
      </section>

      <section className="animate-rise space-y-3 [animation-delay:260ms]">
        <h2 className="font-display text-lg font-semibold">Range of motion</h2>
        <ul className="space-y-2">
          {ROM_JOINTS.map((joint) => (
            <li
              key={joint}
              className="flex items-center justify-between gap-3 rounded-2xl border border-mist bg-white p-3"
            >
              <span className="pl-1 text-sm font-medium capitalize">{joint}s</span>
              <Segmented
                options={ROM_LEVELS}
                value={c.romLimits[joint] ?? "full"}
                onChange={(v) =>
                  update({ romLimits: { ...c.romLimits, [joint]: v } })
                }
                tone="moss"
              />
            </li>
          ))}
        </ul>
        <p className="text-xs text-ink/50">
          Limited range quietly removes deep-range exercises — no penalties,
          just different picks.
        </p>
      </section>

      <section className="animate-rise space-y-3 [animation-delay:320ms]">
        <h2 className="font-display text-lg font-semibold">Equipment I have</h2>
        <div className="flex flex-wrap gap-2">
          {vocabulary.equipment
            .filter((e) => e !== "none")
            .map((eq) => {
              const on = c.equipment.includes(eq);
              return (
                <button
                  key={eq}
                  aria-pressed={on}
                  onClick={() =>
                    update({
                      equipment: on
                        ? c.equipment.filter((x) => x !== eq)
                        : [...c.equipment, eq],
                    })
                  }
                  className={`rounded-full border px-3.5 py-2.5 text-sm capitalize transition-colors ${
                    on
                      ? "border-moss bg-moss text-paper"
                      : "border-mist bg-white text-ink/70"
                  }`}
                >
                  {eq}
                </button>
              );
            })}
        </div>
      </section>

      <section className="animate-rise [animation-delay:380ms]">
        <button
          aria-pressed={c.chairMode}
          onClick={() => update({ chairMode: !c.chairMode })}
          className={`flex w-full items-center justify-between rounded-2xl border p-4 text-left transition-colors ${
            c.chairMode ? "border-periwinkle bg-periwinkle/10" : "border-mist bg-white"
          }`}
        >
          <span>
            <span className="block text-sm font-medium">I train from a chair</span>
            <span className="block text-xs text-ink/50">
              Only chair-friendly exercises make the plan.
            </span>
          </span>
          <span
            className={`font-data rounded-full px-3 py-1 text-xs ${
              c.chairMode ? "bg-periwinkle text-paper" : "bg-mist text-ink/60"
            }`}
          >
            {c.chairMode ? "on" : "off"}
          </span>
        </button>
      </section>

      <footer className="animate-rise space-y-3 [animation-delay:440ms]">
        <p className="font-data text-center text-xs text-ink/50">
          {poolSize} of {exercises.length} exercises fit these limits
        </p>
        <a
          href="#/"
          className="block w-full rounded-xl bg-moss px-6 py-3.5 text-center font-medium text-paper transition-transform active:scale-[0.98]"
        >
          See today's plan
        </a>
        <button
          onClick={() => setC(saveConstraints(defaultConstraints()))}
          className="w-full py-2 text-center text-xs text-ink/50 underline-offset-2 hover:underline"
        >
          Reset everything to clear
        </button>
      </footer>
    </main>
  );
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
  tone,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  tone: "moss" | "ochre" | "mist";
}) {
  const active =
    tone === "moss"
      ? "bg-moss text-paper"
      : tone === "ochre"
        ? "bg-ochre text-paper"
        : "bg-ink/60 text-paper";
  return (
    <div className="flex rounded-full border border-mist bg-paper p-0.5" role="group">
      {options.map((o) => (
        <button
          key={o.value}
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-full px-3 py-2 text-xs transition-colors ${
            value === o.value ? active : "text-ink/60"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
