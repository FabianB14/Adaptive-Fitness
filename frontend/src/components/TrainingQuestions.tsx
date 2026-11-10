import {
  PLAN_STYLES,
  WEEKDAYS,
  LOCATION_LABELS,
  type TrainingLocation,
  trainingPreferences,
  type TrainingPreferences,
} from "../lib/weekly";
const EQUIPMENT = [
  ["bodyweight", "Floor space / bodyweight"],
  ["band", "Resistance bands"],
  ["dumbbell", "Dumbbells"],
  ["machine", "Gym machines"],
  ["barbell", "Barbell"],
];
const field =
  "mt-1 w-full rounded-xl border border-mist bg-paper px-3 py-3 text-sm";
export function TrainingQuestions({
  value,
  onChange,
  equipment,
  onEquipment,
  chairMode,
  onChairMode,
  showLimitsLink = true,
}: {
  value: TrainingPreferences;
  onChange: (p: TrainingPreferences) => void;
  equipment: string[];
  onEquipment: (e: string[]) => void;
  chairMode: boolean;
  onChairMode: (v: boolean) => void;
  showLimitsLink?: boolean;
}) {
  return (
    <div className="space-y-5">
      <label className="block text-sm">
        How many days a week can you make time for movement?
        <select
          className={field}
          value={value.days}
          onChange={(e) =>
            onChange(
              trainingPreferences({
                ...value,
                days: Number(e.target.value),
                weekdays: [],
              }),
            )
          }
        >
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <option key={n} value={n}>
              {n} {n === 1 ? "day" : "days"} a week
            </option>
          ))}
        </select>
        <span className="mt-1 block text-xs text-ink/55">
          Four or more days include gentle recovery sessions.
        </span>
      </label>
      <fieldset>
        <legend className="mb-2 text-sm">
          Which days work best? Choose {value.days}.
        </legend>
        <div className="flex flex-wrap gap-2">
          {WEEKDAYS.map((day, i) => (
            <button
              type="button"
              key={day}
              aria-label={day}
              aria-pressed={value.weekdays.includes(i)}
              onClick={() =>
                onChange({
                  ...value,
                  weekdays: value.weekdays.includes(i)
                    ? value.weekdays.filter((d) => d !== i)
                    : [...value.weekdays, i].sort((a, b) => a - b),
                })
              }
              className={`rounded-full border px-3 py-2 text-sm ${value.weekdays.includes(i) ? "border-moss bg-moss text-paper" : "border-mist bg-card"}`}
            >
              {day.slice(0, 3)}
            </button>
          ))}
        </div>
        {value.weekdays.length !== value.days && (
          <p role="status" className="mt-2 text-xs text-ochre">
            {value.weekdays.length} selected; choose exactly {value.days} to
            save.
          </p>
        )}
      </fieldset>
      <label className="block text-sm">
        How much time do you usually have?
        <select
          className={field}
          value={value.minutes}
          onChange={(e) =>
            onChange({ ...value, minutes: Number(e.target.value) })
          }
        >
          {[10, 20, 30, 45].map((n) => (
            <option key={n} value={n}>
              Up to {n} minutes
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        Where are you starting?
        <select
          className={field}
          value={value.experience}
          onChange={(e) =>
            onChange({
              ...value,
              experience: e.target.value as TrainingPreferences["experience"],
            })
          }
        >
          <option value="new">I'm new to structured workouts</option>
          <option value="returning">I'm getting back into it</option>
          <option value="regular">I already train regularly</option>
        </select>
      </label>
      <section
        className="space-y-3 rounded-2xl border border-mist p-4"
        aria-label="Workout locations"
      >
        <h3 className="font-medium">Gym, home, or a mix</h3>
        <button
          type="button"
          className="w-full rounded-xl bg-moss/10 px-3 py-3 text-sm text-moss"
          onClick={() =>
            onChange(
              trainingPreferences({
                ...value,
                days: 5,
                weekdays: [0, 1, 2, 3, 4],
                locations: {
                  0: "gym",
                  1: "home",
                  2: "gym",
                  3: "home",
                  4: "gym",
                },
                locationOverrides: {},
                locationEquipment: value.locationEquipment ?? {
                  home: ["bodyweight"],
                  gym: ["bodyweight", "band", "dumbbell", "machine", "barbell"],
                },
              }),
            )
          }
        >
          Use 3 gym + 2 home days
        </button>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={!!value.locationEquipment}
            onChange={(e) =>
              onChange({
                ...value,
                locationEquipment: e.target.checked
                  ? { home: ["bodyweight"], gym: [...equipment] }
                  : undefined,
              })
            }
          />
          <span>Choose equipment separately for home and gym</span>
        </label>
        {value.locationEquipment && (
          <>
            <p className="text-xs text-ink/55">
              Choose your usual location for each workout. You can change a
              single date later.
            </p>
            {value.weekdays.map((day) => (
              <label
                key={day}
                className="flex items-center justify-between gap-3 text-sm"
              >
                {WEEKDAYS[day]} location
                <select
                  aria-label={`${WEEKDAYS[day]} usual location`}
                  className="rounded-lg border border-mist bg-paper p-2"
                  value={value.locations?.[day] ?? "home"}
                  onChange={(e) =>
                    onChange({
                      ...value,
                      locations: {
                        ...value.locations,
                        [day]: e.target.value as TrainingLocation,
                      },
                    })
                  }
                >
                  <option value="home">Home</option>
                  <option value="gym">Gym</option>
                </select>
              </label>
            ))}
            {(["home", "gym"] as const).map((location) => (
              <fieldset key={location}>
                <legend className="mb-2 text-sm font-medium">
                  {LOCATION_LABELS[location]} equipment
                </legend>
                <div className="flex flex-wrap gap-2">
                  {EQUIPMENT.map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      aria-label={`${LOCATION_LABELS[location]}: ${label}`}
                      aria-pressed={value.locationEquipment![location].includes(
                        id,
                      )}
                      className={`rounded-xl border px-3 py-2 text-sm ${value.locationEquipment![location].includes(id) ? "border-moss bg-moss/10" : "border-mist"}`}
                      onClick={() =>
                        onChange({
                          ...value,
                          locationEquipment: {
                            ...value.locationEquipment!,
                            [location]: value.locationEquipment![
                              location
                            ].includes(id)
                              ? value.locationEquipment![location].filter(
                                  (e) => e !== id,
                                )
                              : [...value.locationEquipment![location], id],
                          },
                        })
                      }
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </fieldset>
            ))}
          </>
        )}
      </section>
      {!value.locationEquipment && (
        <fieldset>
          <legend className="mb-2 text-sm">What equipment can you use?</legend>
          <div className="flex flex-wrap gap-2">
            {EQUIPMENT.map(([id, label]) => (
              <button
                type="button"
                key={id}
                aria-pressed={equipment.includes(id)}
                onClick={() =>
                  onEquipment(
                    equipment.includes(id)
                      ? equipment.filter((e) => e !== id)
                      : [...equipment, id],
                  )
                }
                className={`rounded-xl border px-3 py-2 text-sm ${equipment.includes(id) ? "border-moss bg-moss/10" : "border-mist bg-card"}`}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-ink/55">
            Exercises without equipment are always available. Your saved body
            limits still apply.{" "}
            {showLimitsLink && (
              <a href="#/constraints" className="text-moss underline">
                Review limits
              </a>
            )}
          </p>
        </fieldset>
      )}
      <label className="flex items-start gap-3 rounded-xl border border-mist p-3 text-sm">
        <input
          type="checkbox"
          className="mt-1"
          checked={chairMode}
          onChange={(e) => onChairMode(e.target.checked)}
        />
        <span>
          I need chair-friendly exercises
          <span className="mt-1 block text-xs text-ink/55">
            Only exercises marked suitable for a chair or wheelchair will be
            included.{" "}
            {showLimitsLink
              ? "Use Limits for pain, impact, and range of motion."
              : "After setup, review Limits before starting if you have pain or movement restrictions."}
          </span>
        </span>
      </label>
      <label className="block text-sm">
        What kind of plan would you like?
        <select
          className={field}
          value={value.style}
          onChange={(e) =>
            onChange({
              ...value,
              style: e.target.value as TrainingPreferences["style"],
            })
          }
        >
          {PLAN_STYLES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
        <span className="mt-1 block text-xs text-ink/55">
          {PLAN_STYLES.find((s) => s.id === value.style)?.description}
        </span>
      </label>
    </div>
  );
}
