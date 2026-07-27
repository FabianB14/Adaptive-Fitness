import { useMemo, useState } from "react";
import {
  addEntry,
  calorieTarget,
  entriesForDate,
  loadEntries,
  loadProfile,
  removeEntry,
  saveProfile,
  totalKcal,
  type ActivityLevel,
  type MealEntry,
  type Profile,
} from "../lib/nutrition";

const MEALS: { key: MealEntry["meal"]; label: string }[] = [
  { key: "breakfast", label: "Breakfast" },
  { key: "lunch", label: "Lunch" },
  { key: "dinner", label: "Dinner" },
  { key: "snack", label: "Snacks" },
];

/** Portion-based quick adds — no food database, per the brief. */
const PORTIONS: { label: string; kcal: number }[] = [
  { label: "Snack-size", kcal: 150 },
  { label: "Light meal", kcal: 350 },
  { label: "Regular meal", kcal: 550 },
  { label: "Big meal", kcal: 750 },
];

const ACTIVITY_OPTIONS: { value: ActivityLevel; label: string }[] = [
  { value: "sedentary", label: "Mostly sitting" },
  { value: "light", label: "On my feet some" },
  { value: "moderate", label: "Active most days" },
  { value: "high", label: "Very active" },
];

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Food diary — MyFitnessPal-shaped: ring up top, meals below, quick
 * portion-based adds. Works with no weight on file (diary without a
 * target) and the target can never dip below the safety floor.
 */
export function Food() {
  const [profile, setProfile] = useState<Profile | null>(() => loadProfile());
  const [editing, setEditing] = useState(false);
  const [entries, setEntries] = useState<MealEntry[]>(() => loadEntries());
  const [adding, setAdding] = useState<MealEntry["meal"] | null>(null);

  const date = todayISO();
  const today = useMemo(() => entriesForDate(entries, date), [entries, date]);
  const eaten = totalKcal(today);
  const target = profile ? calorieTarget(profile, new Date().getFullYear()) : null;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-5 px-5 pb-28 pt-8">
      <header className="animate-rise">
        <p className="text-xs font-medium uppercase tracking-wide text-ink/40">
          {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
        </p>
        <h1 className="font-display mt-0.5 text-[1.75rem] font-semibold leading-tight">
          Food
        </h1>
      </header>

      {!profile || editing ? (
        <ProfileForm
          initial={profile}
          onSave={(p) => {
            saveProfile(p);
            setProfile(p);
            setEditing(false);
          }}
        />
      ) : (
        <>
          <section className="animate-rise rounded-3xl border border-mist bg-card p-6 shadow-sm [animation-delay:80ms]">
            <CalorieRing eaten={eaten} target={target?.kcal ?? null} />
            {target ? (
              <p className="mt-3 text-center text-sm text-ink/60">
                <span className="font-data">{target.kcal.toLocaleString()}</span> target −{" "}
                <span className="font-data">{eaten.toLocaleString()}</span> eaten
                {target.floorApplied && (
                  <span className="mt-1 block text-xs text-ochre">
                    Held at the safety floor — we don't go lower than this.
                  </span>
                )}
              </p>
            ) : (
              <p className="mt-3 text-center text-sm text-ink/60">
                Logging without a calorie target — add a weight anytime to get
                one.
              </p>
            )}
            <button
              onClick={() => setEditing(true)}
              className="mx-auto mt-2 block text-xs text-ink/50 underline-offset-2 hover:underline"
            >
              Edit profile
            </button>
          </section>

          <section className="space-y-2.5" aria-label="Meals">
            {MEALS.map((m, i) => {
              const mealEntries = today.filter((e) => e.meal === m.key);
              return (
                <div
                  key={m.key}
                  className="animate-rise rounded-3xl border border-mist bg-card p-4 shadow-sm"
                  style={{ animationDelay: `${160 + i * 80}ms` }}
                >
                  <div className="flex items-baseline justify-between">
                    <h2 className="font-display text-base font-semibold">{m.label}</h2>
                    <span className="font-data text-sm text-ink/50">
                      {totalKcal(mealEntries).toLocaleString()} kcal
                    </span>
                  </div>
                  <ul className="mt-2 space-y-1.5">
                    {mealEntries.map((e) => (
                      <li key={e.id} className="flex items-center justify-between gap-2 text-sm">
                        <span className="text-ink/80">{e.label || "Entry"}</span>
                        <span className="flex items-center gap-2">
                          <span className="font-data text-ink/60">{e.kcal}</span>
                          <button
                            aria-label={`Remove ${e.label || "entry"}`}
                            onClick={() => setEntries(removeEntry(e.id))}
                            className="px-1 text-ink/35 hover:text-ink/70"
                          >
                            ×
                          </button>
                        </span>
                      </li>
                    ))}
                  </ul>
                  {adding === m.key ? (
                    <AddEntry
                      onAdd={(label, kcal) => {
                        setEntries(addEntry(date, m.key, label, kcal));
                        setAdding(null);
                      }}
                      onCancel={() => setAdding(null)}
                    />
                  ) : (
                    <button
                      onClick={() => setAdding(m.key)}
                      className="mt-2 text-sm text-moss underline-offset-2 hover:underline"
                    >
                      + Add food
                    </button>
                  )}
                </div>
              );
            })}
          </section>
        </>
      )}
    </main>
  );
}

function CalorieRing({ eaten, target }: { eaten: number; target: number | null }) {
  const r = 62;
  const circ = 2 * Math.PI * r;
  const frac = target ? Math.min(eaten / target, 1) : 0;
  const remaining = target ? target - eaten : null;

  return (
    <div className="relative mx-auto h-44 w-44">
      <svg viewBox="0 0 160 160" className="h-full w-full -rotate-90">
        <circle cx="80" cy="80" r={r} className="fill-none stroke-mist" strokeWidth="11" />
        {target && (
          <circle
            cx="80"
            cy="80"
            r={r}
            className="fill-none stroke-moss transition-[stroke-dashoffset] duration-700"
            strokeWidth="11"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={circ * (1 - frac)}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {remaining === null ? (
          <>
            <span className="font-data text-3xl font-medium">{eaten.toLocaleString()}</span>
            <span className="text-xs text-ink/50">kcal today</span>
          </>
        ) : remaining >= 0 ? (
          <>
            <span className="font-data text-3xl font-medium">{remaining.toLocaleString()}</span>
            <span className="text-xs text-ink/50">kcal left</span>
          </>
        ) : (
          <>
            <span className="font-data text-3xl font-medium">{Math.abs(remaining).toLocaleString()}</span>
            <span className="max-w-24 text-center text-xs leading-tight text-ink/50">
              over — tomorrow's a fresh page
            </span>
          </>
        )}
      </div>
    </div>
  );
}

function AddEntry({
  onAdd,
  onCancel,
}: {
  onAdd: (label: string, kcal: number) => void;
  onCancel: () => void;
}) {
  const [label, setLabel] = useState("");
  const [custom, setCustom] = useState("");

  return (
    <div className="mt-3 space-y-2.5 rounded-2xl bg-paper p-3">
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="What was it? (optional)"
        className="w-full rounded-xl border border-mist bg-card px-3 py-2.5 text-sm outline-none focus:border-moss"
        aria-label="Food name"
      />
      <div className="grid grid-cols-2 gap-1.5">
        {PORTIONS.map((p) => (
          <button
            key={p.label}
            onClick={() => onAdd(label, p.kcal)}
            className="rounded-xl border border-mist bg-card px-2 py-2.5 text-xs transition-colors hover:border-moss"
          >
            {p.label} <span className="font-data text-ink/50">~{p.kcal}</span>
          </button>
        ))}
      </div>
      <div className="flex gap-1.5">
        <input
          value={custom}
          onChange={(e) => setCustom(e.target.value.replace(/\D/g, ""))}
          inputMode="numeric"
          placeholder="Custom kcal"
          className="font-data w-full rounded-xl border border-mist bg-card px-3 py-2.5 text-sm outline-none focus:border-moss"
          aria-label="Custom calories"
        />
        <button
          disabled={!custom}
          onClick={() => custom && onAdd(label, parseInt(custom, 10))}
          className="shrink-0 rounded-xl bg-moss px-4 py-2.5 text-sm font-medium text-paper disabled:opacity-40"
        >
          Add
        </button>
      </div>
      <button
        onClick={onCancel}
        className="w-full py-0.5 text-center text-xs text-ink/50 underline-offset-2 hover:underline"
      >
        Never mind
      </button>
    </div>
  );
}

function ProfileForm({
  initial,
  onSave,
}: {
  initial: Profile | null;
  onSave: (p: Profile) => void;
}) {
  const year = new Date().getFullYear();
  const [sex, setSex] = useState<Profile["sex"]>(initial?.sex ?? "male");
  const [age, setAge] = useState(initial ? String(year - initial.birthYear) : "");
  const [height, setHeight] = useState(initial ? String(initial.heightCm) : "");
  const [weight, setWeight] = useState(initial?.weightKg ? String(initial.weightKg) : "");
  const [skipWeight, setSkipWeight] = useState(initial ? initial.weightKg === null : false);
  const [activity, setActivity] = useState<ActivityLevel>(initial?.activity ?? "light");

  const valid = Number(age) >= 18 && Number(height) >= 100 && (skipWeight || Number(weight) > 0);

  return (
    <section className="animate-rise space-y-4 rounded-3xl border border-mist bg-card p-5 shadow-sm [animation-delay:80ms]">
      <div>
        <h2 className="font-display text-lg font-semibold">A few numbers</h2>
        <p className="mt-1 text-sm text-ink/60">
          Just enough to compute a sane calorie target. Weight is optional —
          everything works without it.
        </p>
      </div>

      <div className="flex rounded-full border border-mist bg-paper p-0.5" role="group" aria-label="Formula">
        {(["male", "female"] as const).map((s) => (
          <button
            key={s}
            aria-pressed={sex === s}
            onClick={() => setSex(s)}
            className={`flex-1 rounded-full px-3 py-2 text-sm capitalize transition-colors ${
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
            className="font-data mt-1 w-full rounded-xl border border-mist bg-card px-3 py-2.5 outline-none focus:border-moss"
          />
        </label>
        <label className="text-sm">
          <span className="text-xs text-ink/50">Height (cm)</span>
          <input
            value={height}
            onChange={(e) => setHeight(e.target.value.replace(/\D/g, ""))}
            inputMode="numeric"
            className="font-data mt-1 w-full rounded-xl border border-mist bg-card px-3 py-2.5 outline-none focus:border-moss"
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
            className="font-data mt-1 w-full rounded-xl border border-mist bg-card px-3 py-2.5 outline-none focus:border-moss"
          />
        </label>
      )}
      <button
        aria-pressed={skipWeight}
        onClick={() => setSkipWeight(!skipWeight)}
        className={`w-full rounded-xl border px-3 py-2.5 text-left text-sm transition-colors ${
          skipWeight ? "border-periwinkle bg-periwinkle/10" : "border-mist"
        }`}
      >
        I'd rather not track weight
        <span className="block text-xs text-ink/50">
          You'll log food without a calorie target. Change anytime.
        </span>
      </button>

      <div className="space-y-1.5">
        <span className="text-xs text-ink/50">Most days I'm…</span>
        {ACTIVITY_OPTIONS.map((o) => (
          <button
            key={o.value}
            aria-pressed={activity === o.value}
            onClick={() => setActivity(o.value)}
            className={`w-full rounded-xl border px-3 py-2.5 text-left text-sm transition-colors ${
              activity === o.value ? "border-moss bg-moss/10" : "border-mist"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      <button
        disabled={!valid}
        onClick={() =>
          onSave({
            version: 1,
            sex,
            birthYear: year - Number(age),
            heightCm: Number(height),
            weightKg: skipWeight ? null : Number(weight),
            activity,
          })
        }
        className="w-full rounded-xl bg-moss px-5 py-3 font-medium text-paper transition-transform active:scale-[0.98] disabled:opacity-40"
      >
        Save
      </button>
    </section>
  );
}
