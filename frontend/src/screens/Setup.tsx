import { useState } from "react";
import { GOALS, PACES, type GoalId, type PlanPace } from "../lib/goals";
import {
  calorieTarget,
  loadProfile,
  saveProfile,
  type ActivityLevel,
  type Profile,
} from "../lib/nutrition";

const ACTIVITY_OPTIONS: { value: ActivityLevel; label: string }[] = [
  { value: "sedentary", label: "Mostly sitting" },
  { value: "light", label: "On my feet some" },
  { value: "moderate", label: "Active most days" },
  { value: "high", label: "Very active" },
];

export const ONBOARDED_KEY = "af.onboarded.v1";

export function markOnboarded(): void {
  try {
    localStorage.setItem(ONBOARDED_KEY, "1");
  } catch {
    // The wizard will simply show again next visit.
  }
}

export function isOnboarded(): boolean {
  try {
    return localStorage.getItem(ONBOARDED_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * The intake wizard: who you are → what you want → how hard to push.
 * Out of it comes the full plan — calorie target (floored, always) and
 * goal-weighted training. Every answer is editable later; nothing here
 * is a commitment.
 */
export function Setup() {
  const existing = loadProfile();
  const year = new Date().getFullYear();

  const [step, setStep] = useState(0);
  const [sex, setSex] = useState<Profile["sex"]>(existing?.sex ?? "male");
  const [age, setAge] = useState(existing ? String(year - existing.birthYear) : "");
  const [height, setHeight] = useState(existing ? String(existing.heightCm) : "");
  const [weight, setWeight] = useState(existing?.weightKg ? String(existing.weightKg) : "");
  const [skipWeight, setSkipWeight] = useState(existing ? existing.weightKg === null : false);
  const [activity, setActivity] = useState<ActivityLevel>(existing?.activity ?? "light");
  const [goals, setGoals] = useState<GoalId[]>(existing?.goals ?? []);
  const [pace, setPace] = useState<PlanPace>(existing?.pace ?? "steady");
  const [saved, setSaved] = useState<Profile | null>(null);

  const aboutValid =
    Number(age) >= 18 && Number(height) >= 100 && (skipWeight || Number(weight) > 0);

  function finish() {
    const profile: Profile = {
      version: 1,
      sex,
      birthYear: year - Number(age),
      heightCm: Number(height),
      weightKg: skipWeight ? null : Number(weight),
      activity,
      goals,
      pace,
    };
    saveProfile(profile);
    markOnboarded();
    setSaved(profile);
    setStep(3);
  }

  const target = saved ? calorieTarget(saved, year) : null;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 px-5 pb-28 pt-8">
      <header className="animate-rise">
        <p className="text-xs font-medium uppercase tracking-wide text-ink/40">
          {step < 3 ? `Step ${step + 1} of 3` : "All set"}
        </p>
        <h1 className="font-display mt-0.5 text-[1.75rem] font-semibold leading-tight">
          {step === 0 && "About you"}
          {step === 1 && "What are you after?"}
          {step === 2 && "How hard should we push?"}
          {step === 3 && "Your plan is ready"}
        </h1>
        {step === 0 && (
          <p className="mt-2 text-sm text-ink/60">
            Just enough to build your plan. Weight is optional — everything
            works without it.
          </p>
        )}
        {step === 1 && (
          <p className="mt-2 text-sm text-ink/60">
            Pick as many as apply. These shape what your days emphasize.
          </p>
        )}
      </header>

      {step === 0 && (
        <section className="animate-rise space-y-4 [animation-delay:80ms]">
          <div className="flex rounded-full border border-mist bg-paper p-0.5" role="group" aria-label="Formula">
            {(["male", "female"] as const).map((s) => (
              <button
                key={s}
                aria-pressed={sex === s}
                onClick={() => setSex(s)}
                className={`flex-1 rounded-full px-3 py-2.5 text-sm capitalize transition-colors ${
                  sex === s ? "bg-moss text-paper" : "text-ink/60"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="text-sm">
              <span className="text-xs text-ink/50">Age</span>
              <input
                value={age}
                onChange={(e) => setAge(e.target.value.replace(/\D/g, ""))}
                inputMode="numeric"
                className="font-data mt-1 w-full rounded-xl border border-mist bg-card px-3 py-3 outline-none focus:border-moss"
              />
            </label>
            <label className="text-sm">
              <span className="text-xs text-ink/50">Height (cm)</span>
              <input
                value={height}
                onChange={(e) => setHeight(e.target.value.replace(/\D/g, ""))}
                inputMode="numeric"
                className="font-data mt-1 w-full rounded-xl border border-mist bg-card px-3 py-3 outline-none focus:border-moss"
              />
            </label>
          </div>

          {!skipWeight && (
            <label className="block text-sm">
              <span className="text-xs text-ink/50">Weight (kg)</span>
              <input
                value={weight}
                onChange={(e) => setWeight(e.target.value.replace(/[^\d.]/g, ""))}
                inputMode="decimal"
                className="font-data mt-1 w-full rounded-xl border border-mist bg-card px-3 py-3 outline-none focus:border-moss"
              />
            </label>
          )}
          <button
            aria-pressed={skipWeight}
            onClick={() => setSkipWeight(!skipWeight)}
            className={`w-full rounded-xl border px-3 py-3 text-left text-sm transition-colors ${
              skipWeight ? "border-periwinkle bg-periwinkle/10" : "border-mist bg-card"
            }`}
          >
            I'd rather not track weight
            <span className="block text-xs text-ink/50">
              You'll get a full plan without a calorie target. Change anytime.
            </span>
          </button>

          <div className="space-y-1.5">
            <span className="text-xs text-ink/50">Most days I'm…</span>
            {ACTIVITY_OPTIONS.map((o) => (
              <button
                key={o.value}
                aria-pressed={activity === o.value}
                onClick={() => setActivity(o.value)}
                className={`w-full rounded-xl border px-3 py-3 text-left text-sm transition-colors ${
                  activity === o.value ? "border-moss bg-moss/10" : "border-mist bg-card"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>

          <button
            disabled={!aboutValid}
            onClick={() => setStep(1)}
            className="w-full rounded-xl bg-moss px-5 py-3.5 font-medium text-paper transition-transform active:scale-[0.98] disabled:opacity-40"
          >
            Next
          </button>
        </section>
      )}

      {step === 1 && (
        <section className="animate-rise space-y-4 [animation-delay:80ms]">
          <div className="flex flex-wrap gap-2">
            {GOALS.map((g) => {
              const on = goals.includes(g.id);
              return (
                <button
                  key={g.id}
                  aria-pressed={on}
                  onClick={() =>
                    setGoals(on ? goals.filter((x) => x !== g.id) : [...goals, g.id])
                  }
                  className={`rounded-full border px-4 py-2.5 text-sm transition-colors ${
                    on ? "border-moss bg-moss text-paper" : "border-mist bg-card text-ink/70"
                  }`}
                >
                  {g.label}
                </button>
              );
            })}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setStep(0)}
              className="rounded-xl border border-mist px-5 py-3.5 text-sm text-ink/60"
            >
              Back
            </button>
            <button
              onClick={() => setStep(2)}
              className="flex-1 rounded-xl bg-moss px-5 py-3.5 font-medium text-paper transition-transform active:scale-[0.98]"
            >
              {goals.length > 0 ? "Next" : "Skip — just keep me moving"}
            </button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="animate-rise space-y-3 [animation-delay:80ms]">
          {PACES.map((p) => (
            <button
              key={p.id}
              aria-pressed={pace === p.id}
              onClick={() => setPace(p.id)}
              className={`w-full rounded-2xl border p-4 text-left transition-colors ${
                pace === p.id ? "border-moss bg-moss/10" : "border-mist bg-card"
              }`}
            >
              <span className="font-display block font-semibold">{p.label}</span>
              <span className="block text-sm text-ink/60">{p.desc}</span>
            </button>
          ))}
          <p className="text-xs text-ink/50">
            Whatever you pick, calorie targets never go below the safety floor
            and loads never jump more than 5% a week.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setStep(1)}
              className="rounded-xl border border-mist px-5 py-3.5 text-sm text-ink/60"
            >
              Back
            </button>
            <button
              onClick={finish}
              className="flex-1 rounded-xl bg-moss px-5 py-3.5 font-medium text-paper transition-transform active:scale-[0.98]"
            >
              Build my plan
            </button>
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="animate-rise space-y-4 [animation-delay:80ms]">
          <div className="rounded-3xl border border-mist bg-card p-5 shadow-sm">
            {target ? (
              <>
                <p className="font-data text-3xl font-medium">
                  {target.kcal.toLocaleString()}{" "}
                  <span className="text-base text-ink/50">kcal / day</span>
                </p>
                <p className="mt-1 text-sm text-ink/60">
                  {target.floorApplied
                    ? "Held at the safety floor — we don't go lower."
                    : `A ${pace} pace below your ~${target.tdee.toLocaleString()} kcal burn.`}
                </p>
              </>
            ) : (
              <p className="text-sm text-ink/60">
                No calorie target (no weight on file) — your food diary still
                works, and training adapts all the same.
              </p>
            )}
            <p className="mt-3 border-t border-mist pt-3 text-sm text-ink/60">
              Training now emphasizes:{" "}
              {goals.length > 0
                ? GOALS.filter((g) => goals.includes(g.id))
                    .map((g) => g.label.toLowerCase())
                    .join(", ")
                : "balanced full-body work"}
              . Every day still offers Full, Light, and Minimum — all three
              count.
            </p>
          </div>

          {goals.includes("injury_recovery") && (
            <a
              href="#/constraints"
              className="block w-full rounded-xl border border-ochre px-5 py-3.5 text-center text-sm font-medium text-ochre transition-transform active:scale-[0.98]"
            >
              Set your limits first (recommended)
            </a>
          )}
          <a
            href="#/"
            className="block w-full rounded-xl bg-moss px-5 py-3.5 text-center font-medium text-paper transition-transform active:scale-[0.98]"
          >
            See today's plan
          </a>
        </section>
      )}

      {step < 3 && (
        <button
          onClick={() => {
            markOnboarded();
            window.location.hash = "#/";
          }}
          className="pb-2 text-center text-xs text-ink/45 underline-offset-2 hover:underline"
        >
          Skip setup for now
        </button>
      )}
    </main>
  );
}
