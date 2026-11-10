import { useState } from "react";
import { TrainingQuestions } from "../components/TrainingQuestions";
import { ExerciseDemo } from "../components/ExerciseDemo";
import { loadConstraints, saveConstraints } from "../lib/constraints";
import { loadProfile, saveProfile } from "../lib/nutrition";
import { loadLogs, loadPainEvents } from "../lib/logs";
import { daySignals } from "../lib/engine";
import { loadStates, slugsToAvoid } from "../lib/progress";
import { GOALS } from "../lib/goals";
import {
  addDays,
  generateWeek,
  localDateISO,
  PLAN_STYLES,
  trainingPreferences,
  WEEKDAYS,
  LOCATION_LABELS,
  type TrainingLocation,
} from "../lib/weekly";

export function WeeklyPlan() {
  const [profile, setProfile] = useState(loadProfile);
  const [constraints, setConstraints] = useState(loadConstraints);
  const [prefs, setPrefs] = useState(() =>
    trainingPreferences(profile?.training),
  );
  const [chairMode, setChairMode] = useState(constraints.chairMode);
  const [equipment, setEquipment] = useState(constraints.equipment);
  const [editing, setEditing] = useState(!profile?.training);
  const [offset, setOffset] = useState(0);
  const [saved, setSaved] = useState(false);
  const today = localDateISO();
  const week = generateWeek(
    constraints,
    addDays(today, offset * 7),
    profile,
    slugsToAvoid(loadStates()),
    loadPainEvents(),
  );
  const signals = daySignals(loadLogs(), today);
  const logs = loadLogs();
  const style = PLAN_STYLES.find((s) => s.id === week.style)!;
  const valid = prefs.weekdays.length === prefs.days;
  function save() {
    if (!profile || !valid) return;
    const next = { ...profile, training: trainingPreferences(prefs) };
    saveProfile(next);
    setProfile(next);
    const availableEquipment = next.training.locationEquipment
      ? [
          ...new Set([
            ...next.training.locationEquipment.home,
            ...next.training.locationEquipment.gym,
          ]),
        ]
      : equipment;
    setEquipment(availableEquipment);
    setConstraints(
      saveConstraints({
        ...constraints,
        equipment: availableEquipment,
        chairMode,
      }),
    );
    setEditing(false);
    setSaved(true);
  }
  function changeLocation(date: string, location: TrainingLocation) {
    if (!profile?.training?.locationEquipment) return;
    const next = {
      ...profile,
      training: trainingPreferences({
        ...profile.training,
        locationOverrides: {
          ...profile.training.locationOverrides,
          [date]: location,
        },
      }),
    };
    saveProfile(next);
    setProfile(next);
    setPrefs(next.training);
  }
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-5 px-5 pb-28 pt-8">
      <header>
        <a className="text-sm text-moss" href="#/">
          ← Today
        </a>
        <p className="mt-5 text-xs uppercase tracking-wide text-ink/45">
          A little structure, room for life
        </p>
        <h1 className="font-display text-3xl font-semibold">Your week</h1>
        <p className="mt-2 text-sm text-ink/60">
          A plan built around your goals, time, equipment, and body limits.
          Light days and rest belong here too.
        </p>
        <a href="#/calendar" className="mt-3 inline-block text-sm font-medium text-moss underline">
          View workout history in the calendar →
        </a>
      </header>
      {!profile ? (
        <a href="#/setup" className="rounded-2xl bg-moss p-4 text-paper">
          Tell us about your goals to create your week →
        </a>
      ) : (
        <>
          <section className="rounded-3xl border border-mist bg-card p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-lg font-semibold">
                {editing ? "Make it fit your life" : style.label}
              </h2>
              <button
                className="text-sm text-moss"
                onClick={() => {
                  setPrefs(trainingPreferences(profile.training));
                  setEquipment(constraints.equipment);
                  setChairMode(constraints.chairMode);
                  setEditing(!editing);
                }}
              >
                {editing ? "Cancel" : "Adjust plan"}
              </button>
            </div>
            {editing ? (
              <div className="mt-4 space-y-5">
                <TrainingQuestions
                  value={prefs}
                  onChange={setPrefs}
                  equipment={equipment}
                  onEquipment={setEquipment}
                  chairMode={chairMode}
                  onChairMode={setChairMode}
                />
                <button
                  disabled={!valid}
                  onClick={save}
                  className="w-full rounded-xl bg-moss px-4 py-3 font-medium text-paper disabled:opacity-40"
                >
                  Save my weekly plan
                </button>
                <p className="text-xs text-ink/50">
                  Saving updates your weekly schedule. Your completed workouts
                  stay in Progress.
                </p>
              </div>
            ) : (
              <>
                <p className="mt-2 text-sm text-ink/65">{style.description}</p>
                <p className="mt-3 text-sm">
                  {prefs.locationEquipment
                    ? `${week.days.filter((d) => d.location === "gym").length} gym + ${week.days.filter((d) => d.location === "home").length} home days`
                    : `${prefs.days} days`}{" "}
                  · up to {prefs.minutes} min ·{" "}
                  {prefs.experience === "regular"
                    ? "regular training"
                    : prefs.experience === "returning"
                      ? "returning gently"
                      : "starting gently"}
                </p>
                <p className="mt-2 text-xs text-ink/55">
                  Goals:{" "}
                  {GOALS.filter((g) => profile.goals?.includes(g.id))
                    .map((g) => g.label)
                    .join(", ") || "build a regular movement habit"}
                  . Your pace and daily activity inform the starting level. Body
                  measurements remain in your nutrition profile.
                </p>
                <a
                  href="#/setup"
                  className="mt-3 inline-block text-sm text-moss underline"
                >
                  Update goals & profile
                </a>
              </>
            )}
          </section>
          {saved && (
            <p
              role="status"
              className="rounded-xl bg-moss/10 p-3 text-sm text-moss"
            >
              Your week is saved. Today's session now follows this plan.
            </p>
          )}
          {!profile.training && (
            <p className="text-sm text-ink/60">
              This is a starting preview. Save your answers above to use it for
              your workouts.
            </p>
          )}
          {(signals.gapReturn || signals.deload) && (
            <p className="rounded-xl bg-periwinkle/10 p-3 text-sm">
              {signals.gapReturn
                ? "Getting back into it? Choose Light today. Your remembered loads ease down automatically."
                : "A lighter week is due. Your session loads adjust when you start."}
            </p>
          )}
          <div className="flex items-center justify-between gap-2">
            <button
              aria-label="Previous week"
              onClick={() => setOffset(offset - 1)}
              className="rounded-xl border border-mist px-4 py-2"
            >
              ←
            </button>
            <button onClick={() => setOffset(0)} className="text-sm">
              Week of{" "}
              {new Date(`${week.start}T12:00:00`).toLocaleDateString(
                undefined,
                { month: "short", day: "numeric" },
              )}
            </button>
            <button
              aria-label="Next week"
              onClick={() => setOffset(offset + 1)}
              className="rounded-xl border border-mist px-4 py-2"
            >
              →
            </button>
          </div>
          <section aria-label="Weekly schedule" className="space-y-3">
            {week.days.map((day, i) => {
              const log = logs.find((l) => l.date === day.date);
              return (
                <details
                  key={day.date}
                  open={day.date === today}
                  className={`rounded-2xl border bg-card ${day.date === today ? "border-moss" : "border-mist"}`}
                >
                  <summary className="cursor-pointer p-4">
                    <span className="text-xs text-ink/50">
                      {WEEKDAYS[i]} · {day.date.slice(5)}{" "}
                      {day.date === today ? "· Today" : ""}
                      {log
                        ? ` · ${log.tier === "rest" ? "Rest logged" : "Workout logged"}`
                        : ""}
                    </span>
                    <span className="mt-1 block font-medium">
                      {day.title}
                      {day.location
                        ? ` · ${LOCATION_LABELS[day.location]}`
                        : ""}
                    </span>
                  </summary>
                  <div className="space-y-3 border-t border-mist p-4">
                    {day.location && (
                      <label className="block text-sm">
                        Where will you train?
                        <select
                          aria-label={`${day.date} workout location`}
                          value={day.location}
                          disabled={!!log || day.date < today}
                          onChange={(e) =>
                            changeLocation(
                              day.date,
                              e.target.value as TrainingLocation,
                            )
                          }
                          className="ml-2 rounded-lg border border-mist bg-paper p-2"
                        >
                          <option value="home">Home</option>
                          <option value="gym">Gym</option>
                        </select>
                        <span className="mt-1 block text-xs text-ink/50">
                          Changes apply to this date only. Exercises update for
                          that location's equipment.
                        </span>
                      </label>
                    )}
                    <p className="text-sm text-ink/60">{day.guidance}</p>
                    {day.plan.notes.map((n) => (
                      <p className="text-xs text-ochre" key={n}>
                        {n}
                      </p>
                    ))}
                    {day.plan.full.map((item) => (
                      <details
                        key={item.exercise.slug}
                        className="rounded-xl bg-paper p-3"
                      >
                        <summary className="cursor-pointer text-sm">
                          {item.exercise.name}
                          <span className="ml-2 text-ink/50">{item.dose}</span>
                        </summary>
                        <ExerciseDemo exercise={item.exercise} />
                      </details>
                    ))}
                    {!day.rest && day.plan.full.length > 0 && (
                      <p className="text-xs text-ink/50">
                        Time is an estimate, including rests. Take longer breaks
                        whenever you need them.
                      </p>
                    )}
                    {day.date === today && profile.training && !log && (
                      <a
                        href="#/"
                        className="block rounded-xl bg-moss px-3 py-3 text-center text-sm font-medium text-paper"
                      >
                        {day.rest
                          ? "Log rest on Today"
                          : "Choose Full, Light, or Minimum"}
                      </a>
                    )}
                  </div>
                </details>
              );
            })}
          </section>
          <p className="text-xs text-ink/55">
            The week refreshes when your limits, pain reports, or goals change.
            Stop a painful movement and record it in Today so the next session
            can adapt.
          </p>
        </>
      )}
    </main>
  );
}
