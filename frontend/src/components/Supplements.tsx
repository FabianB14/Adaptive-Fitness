import { useState } from "react";
import { localDateISO } from "../lib/weekly";
const ODS =
  "https://ods.od.nih.gov/factsheets/ExerciseAndAthleticPerformance-HealthProfessional/";
const OPTIONS = [
  {
    id: "creatine",
    name: "Creatine monohydrate",
    about:
      "May help repeated high-intensity efforts and strength training. Benefits build with regular use; it is not a stimulant.",
    use: "Studies in healthy adults commonly use 3–5 g/day. Loading is optional. This is background information, not a personal dose recommendation.",
    caution:
      "Can increase body weight through water retention and cause stomach upset. Ask a clinician before use if you have kidney disease, are pregnant or breastfeeding, or take regular medicines.",
    source: ODS,
  },
  {
    id: "preworkout",
    name: "Pre-workout / caffeine",
    about:
      "Some products contain caffeine; others have multiple stimulants or poorly described blends. Check the full label and caffeine per serving.",
    use: "Count caffeine from coffee, tea, energy drinks, and supplements together. The FDA cites 400 mg/day as an amount generally not associated with negative effects for most healthy adults; it is not a target or suitable limit for everyone.",
    caution:
      "Caffeine can worsen sleep, anxiety, heart rate, and blood pressure. Some people need much less or none. Get advice with heart conditions, pregnancy, breastfeeding, or interacting medicines. Avoid stacking stimulant products.",
    source:
      "https://www.fda.gov/consumers/consumer-updates/spilling-beans-how-much-caffeine-too-much",
  },
  {
    id: "protein",
    name: "Protein powder",
    about:
      "A convenient protein food when meals do not cover your needs. It is optional if you already get enough protein from food.",
    use: "Use the label to count calories and protein in your food diary. Whey, soy, and other products have different ingredients and serving sizes.",
    caution:
      "Check allergens, sweeteners, and all ingredients; meal preferences do not screen supplement labels. Follow a prescribed protein limit if you have one.",
    source: ODS,
  },
  {
    id: "electrolytes",
    name: "Electrolytes",
    about:
      "Can be useful with prolonged activity, heavy sweating, or heat. Water and regular meals are often enough for shorter sessions.",
    use: "Needs vary with sweat loss and conditions. Check sodium, potassium, sugar, and serving size on the label.",
    caution:
      "Ask your clinician first if you have kidney or heart disease, a sodium or potassium restriction, or medicines that affect electrolytes.",
    source: ODS,
  },
];
interface SupplementState {
  version: 1;
  selected: string[];
  taken: Record<string, string[]>;
}
const KEY = "af.supplements.v1";
function load(): SupplementState {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (v?.version === 1)
      return {
        version: 1,
        selected: Array.isArray(v.selected)
          ? v.selected.filter((id: string) => OPTIONS.some((s) => s.id === id))
          : [],
        taken: Object.fromEntries(
          Object.entries(v.taken ?? {})
            .filter(
              ([d, v]) => /^\d{4}-\d{2}-\d{2}$/.test(d) && Array.isArray(v),
            )
            .slice(-90),
        ) as Record<string, string[]>,
      };
  } catch {
    /* use defaults */
  }
  return { version: 1, selected: [], taken: {} };
}
export function Supplements() {
  const [state, setState] = useState(load);
  const [note, setNote] = useState("");
  const today = localDateISO();
  function save(next: SupplementState) {
    setState(next);
    try {
      localStorage.setItem(
        KEY,
        JSON.stringify({
          ...next,
          taken: Object.fromEntries(
            Object.entries(next.taken)
              .sort(([a], [b]) => a.localeCompare(b))
              .slice(-90),
          ),
        }),
      );
      setNote("");
    } catch {
      setNote("Your checklist could not be saved on this device.");
    }
  }
  return (
    <section
      className="rounded-3xl border border-mist bg-card p-5"
      aria-label="Optional supplements"
    >
      <h2 className="font-display text-lg font-semibold">
        Optional supplements
      </h2>
      <p className="mt-2 text-sm text-ink/60">
        Learn about common options and keep a personal checklist. Supplements
        are optional; these choices do not change your workout intensity or
        create a dosing schedule.
      </p>
      <p className="mt-2 text-xs text-ink/55">
        General information for adults. Review supplements with a clinician or
        pharmacist when you have a medical condition or take medicines. Look for
        independent testing, such as NSF Certified for Sport or Informed Sport;
        testing does not guarantee a product is suitable for you.
      </p>
      <div className="mt-4 space-y-3">
        {OPTIONS.map((s) => (
          <details key={s.id} className="rounded-xl border border-mist p-3">
            <summary className="cursor-pointer text-sm font-medium">
              {s.name}
              {state.selected.includes(s.id) ? " · In my checklist" : ""}
            </summary>
            <p className="mt-3 text-sm">{s.about}</p>
            <p className="mt-2 text-xs text-ink/65">{s.use}</p>
            <p className="mt-2 text-xs text-ink/65">{s.caution}</p>
            <a
              className="mt-2 block text-xs text-moss underline"
              href={s.source}
              target="_blank"
              rel="noreferrer"
            >
              Read the NIH / FDA guidance
            </a>
            <label className="mt-3 flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                aria-label={`Include ${s.name} in my checklist`}
                checked={state.selected.includes(s.id)}
                onChange={(e) =>
                  save({
                    ...state,
                    selected: e.target.checked
                      ? [...state.selected, s.id]
                      : state.selected.filter((id) => id !== s.id),
                  })
                }
              />
              Include in my personal checklist
            </label>
          </details>
        ))}
      </div>
      {state.selected.length > 0 && (
        <fieldset className="mt-4 space-y-3 border-t border-mist pt-4">
          <legend className="pt-3 text-sm font-medium">
            What I took today · {today}
          </legend>
          <p className="text-xs text-ink/55">
            Mark only what you actually took. This records your choice; it is
            not a reminder to take it.
          </p>
          {OPTIONS.filter((s) => state.selected.includes(s.id)).map((s) => (
            <label key={s.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                aria-label={`Taken today: ${s.name}`}
                checked={(state.taken[today] ?? []).includes(s.id)}
                onChange={(e) =>
                  save({
                    ...state,
                    taken: {
                      ...state.taken,
                      [today]: e.target.checked
                        ? [...(state.taken[today] ?? []), s.id]
                        : (state.taken[today] ?? []).filter(
                            (id) => id !== s.id,
                          ),
                    },
                  })
                }
              />
              {s.name}
            </label>
          ))}
        </fieldset>
      )}
      {note && (
        <p role="status" className="mt-2 text-xs text-ochre">
          {note}
        </p>
      )}
    </section>
  );
}
