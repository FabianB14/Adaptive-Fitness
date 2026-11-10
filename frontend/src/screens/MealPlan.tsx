import { useState } from "react";
import {
  addEntry,
  calorieTarget,
  goalForProfile,
  loadEntries,
  loadProfile,
  removeEntry,
  saveProfile,
  type NutritionGoal,
} from "../lib/nutrition";
import { addDays, localDateISO, WEEKDAYS } from "../lib/weekly";
import {
  EATING_PATTERNS,
  FOOD_OPTIONS,
  MEAL_SLOTS,
  foodLabel,
  generateMealWeek,
  loadMealPreferences,
  mealSourceKey,
  recipeFits,
  saveMealPreferences,
  validDailyMeal,
  type FoodId,
  type MealPreferences,
  type MealRecipe,
  type MealSlot,
} from "../lib/mealPlans";
const input =
  "mt-1 w-full rounded-xl border border-mist bg-paper px-3 py-3 text-sm";
export function MealPlan() {
  const [profile, setProfile] = useState(loadProfile);
  const [prefs, setPrefs] = useState(() =>
    loadMealPreferences(goalForProfile(profile)),
  );
  const [entries, setEntries] = useState(loadEntries);
  const [offset, setOffset] = useState(0);
  const [notice, setNotice] = useState("");
  const today = localDateISO();
  const target = profile
    ? calorieTarget(
        { ...profile, nutritionGoal: prefs.goal },
        new Date().getFullYear(),
      )
    : null;
  const days = generateMealWeek(
    prefs,
    addDays(today, offset * 7),
    target?.kcal ?? null,
  );
  function update(next: MealPreferences) {
    setPrefs(next);
    const stored = saveMealPreferences(next);
    setNotice(
      stored
        ? "Preferences saved on this device."
        : "Storage is unavailable. Your choices work now but may not survive a reload.",
    );
    if (profile && next.goal !== goalForProfile(profile)) {
      const p = { ...profile, nutritionGoal: next.goal };
      saveProfile(p);
      setProfile(p);
    }
  }
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-5 px-5 pb-28 pt-8">
      <header>
        <a href="#/food" className="text-sm text-moss">
          ← Food diary
        </a>
        <p className="mt-5 text-xs uppercase tracking-wide text-ink/45">
          Simple meals, your preferences
        </p>
        <h1 className="font-display text-3xl font-semibold">Plan your meals</h1>
        <p className="mt-2 text-sm text-ink/60">
          Start with a menu, leave out foods you don't like, and keep a daily
          favorite. Swap any suggested meal.
        </p>
      </header>
      <section
        className="space-y-4 rounded-3xl border border-mist bg-card p-5"
        aria-label="Meal preferences"
      >
        <label className="block text-sm">
          My food goal
          <select
            className={input}
            value={prefs.goal}
            onChange={(e) =>
              update({ ...prefs, goal: e.target.value as NutritionGoal })
            }
          >
            <option value="maintain">
              Maintain weight / everyday nourishment
            </option>
            <option value="gain">Build muscle / gradual weight gain</option>
            <option value="lose">Gradual weight loss</option>
          </select>
        </label>
        <label className="block text-sm">
          Eating pattern
          <select
            className={input}
            value={prefs.pattern}
            onChange={(e) =>
              update({
                ...prefs,
                pattern: e.target.value as MealPreferences["pattern"],
              })
            }
          >
            {EATING_PATTERNS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <p className="text-xs text-ink/60">
          {EATING_PATTERNS.find((p) => p.id === prefs.pattern)?.description}
        </p>
        {prefs.pattern === "mind" && (
          <a
            className="block text-xs text-moss underline"
            href="https://www.rush.edu/news/mind-diet"
            target="_blank"
            rel="noreferrer"
          >
            About the MIND eating pattern · Rush
          </a>
        )}
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={prefs.budget}
            onChange={(e) => update({ ...prefs, budget: e.target.checked })}
          />
          <span>
            Use lower-cost meals
            <span className="mt-1 block text-xs text-ink/55">
              Beans, oats, rice, and frozen produce. Prices vary by shop and
              location.
            </span>
          </span>
        </label>
        <details>
          <summary className="cursor-pointer text-sm font-medium">
            Foods to leave out ({prefs.excluded.length})
          </summary>
          <p className="mt-2 text-xs text-ink/55">
            Check foods you dislike or want excluded. Menus remove their listed
            ingredients. For allergies, also check ingredient labels and
            cross-contact; these filters cannot guarantee an allergen-free meal.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {FOOD_OPTIONS.map(([id, label]) => (
              <label key={id} className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={prefs.excluded.includes(id)}
                  onChange={(e) =>
                    update({
                      ...prefs,
                      excluded: e.target.checked
                        ? [...prefs.excluded, id]
                        : prefs.excluded.filter((x) => x !== id),
                    })
                  }
                />
                {label}
              </label>
            ))}
          </div>
        </details>
      </section>
      {notice && (
        <p role="status" className="text-sm text-moss">
          {notice}
        </p>
      )}
      <section className="rounded-2xl bg-moss/10 p-4 text-sm">
        <p>
          {target
            ? `Estimated ${prefs.goal === "gain" ? "muscle-gain" : prefs.goal === "lose" ? "weight-loss" : "maintenance"} starting target: ${target.kcal.toLocaleString()} kcal/day.`
            : "No personal calorie target. These are standard meal ideas; weight is optional."}
        </p>
        <p className="mt-2 text-xs text-ink/60">
          Portions and nutrition are estimates, not a prescribed diet. Adjust
          for hunger and your needs. If you follow a medical diet, use your
          clinician's guidance. Your saved daily meals keep their original
          portion.
        </p>
        <a className="mt-2 block text-xs text-moss underline" href="#/setup">
          Update profile & goals
        </a>
      </section>
      <details className="rounded-3xl border border-mist bg-card p-5">
        <summary className="cursor-pointer font-medium">My daily meals</summary>
        <p className="mt-2 text-xs text-ink/60">
          Keep your usual breakfast, lunch, dinner, or snack every day. It
          replaces that slot in the menu. Your own meal may differ from the
          selected eating pattern; food exclusions still apply.
        </p>
        <ul className="mt-3 space-y-2">
          {MEAL_SLOTS.map(
            ({ id, label }) =>
              prefs.dailyMeals[id] && (
                <li
                  key={id}
                  className="flex items-start justify-between gap-2 text-sm"
                >
                  <span>
                    {label}: {prefs.dailyMeals[id]!.name}
                  </span>
                  <button
                    aria-label={`Remove daily ${label.toLowerCase()}`}
                    className="text-moss underline"
                    onClick={() => {
                      const dailyMeals = { ...prefs.dailyMeals };
                      delete dailyMeals[id];
                      update({ ...prefs, dailyMeals });
                    }}
                  >
                    Remove
                  </button>
                </li>
              ),
          )}
        </ul>
        <DailyMealForm
          prefs={prefs}
          onSave={(recipe) =>
            update({
              ...prefs,
              dailyMeals: { ...prefs.dailyMeals, [recipe.meal]: recipe },
            })
          }
        />
      </details>
      <div className="flex items-center justify-between">
        <button
          aria-label="Previous meal week"
          className="rounded-xl border border-mist px-4 py-2"
          onClick={() => setOffset(offset - 1)}
        >
          ←
        </button>
        <button onClick={() => setOffset(0)} className="text-sm">
          Week of{" "}
          {new Date(`${days[0].date}T12:00:00`).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          })}
        </button>
        <button
          aria-label="Next meal week"
          className="rounded-xl border border-mist px-4 py-2"
          onClick={() => setOffset(offset + 1)}
        >
          →
        </button>
      </div>
      <section aria-label="Weekly meals" className="space-y-3">
        {days.map((day, index) => {
          const displayedTotal = day.meals.reduce(
            (sum, meal) =>
              sum +
              (entries.find(
                (e) => e.sourceKey === mealSourceKey(day.date, meal.slot),
              )?.kcal ?? meal.kcal),
            0,
          );
          return (
            <details
              key={day.date}
              open={day.date === today}
              className={`rounded-2xl border bg-card ${day.date === today ? "border-moss" : "border-mist"}`}
            >
              <summary className="cursor-pointer p-4">
                <span className="block font-medium">
                  {WEEKDAYS[index]} · {day.date.slice(5)}
                  {day.date === today ? " · Today" : ""}
                </span>
                <span className="text-xs text-ink/55">
                  {day.complete ? "Menu estimate" : "Incomplete menu"} · ~
                  {displayedTotal.toLocaleString()} kcal
                </span>
              </summary>
              <div className="space-y-4 border-t border-mist p-4">
                {day.needsMoreFood && (
                  <p className="rounded-xl bg-ochre/10 p-3 text-sm text-ochre">
                    This menu needs more food to serve as a full day. Add meals
                    or increase portions, especially if your saved meals are
                    small. Do not use this estimate as a restriction.
                  </p>
                )}
                {!day.complete && (
                  <p className="text-sm text-ochre">
                    Some meals do not fit your preferences. Add a daily meal or
                    adjust your food choices to complete this menu.
                  </p>
                )}
                {day.meals.map((meal) => {
                  const logged = entries.find(
                    (e) => e.sourceKey === mealSourceKey(day.date, meal.slot),
                  );
                  const label = MEAL_SLOTS.find(
                    (s) => s.id === meal.slot,
                  )!.label;
                  return (
                    <article
                      key={meal.slot}
                      className="rounded-xl bg-paper p-3"
                    >
                      <p className="text-xs uppercase tracking-wide text-ink/50">
                        {label}
                      </p>
                      <h3 className="mt-1 font-medium">
                        {logged?.label ??
                          meal.recipe?.name ??
                          "No matching meal"}
                      </h3>
                      {meal.warning && (
                        <p className="mt-2 text-xs text-ochre">
                          {meal.warning}
                        </p>
                      )}
                      {logged ? (
                        <p className="mt-2 text-sm text-moss">
                          Logged in your food diary · {logged.kcal} kcal. Your
                          eaten meal stays here when the plan changes.
                        </p>
                      ) : meal.recipe ? (
                        <>
                          <p className="mt-1 text-xs text-ink/55">
                            ~{meal.kcal} kcal · ~{meal.protein} g protein
                            {meal.recipe.custom ? " · Your daily meal" : ""}
                          </p>
                          <details className="mt-2 text-sm">
                            <summary className="cursor-pointer text-moss">
                              Ingredients & preparation
                            </summary>
                            <p className="mt-2">
                              {meal.servings} × listed serving:{" "}
                              {meal.recipe.portion}
                            </p>
                            <p className="mt-2 text-xs text-ink/60">
                              Foods:{" "}
                              {meal.recipe.ingredients
                                .map(foodLabel)
                                .join(", ")}
                              .
                            </p>
                            <p className="mt-2">{meal.recipe.method}</p>
                          </details>
                        </>
                      ) : (
                        <p className="mt-2 text-sm text-ink/60">
                          Try another eating pattern, adjust excluded foods, or
                          add your own meal for this slot.
                        </p>
                      )}
                      {(meal.recipe || logged) && (
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              aria-label={`Log ${meal.slot} for ${day.date}`}
                              checked={!!logged}
                              disabled={day.date > today}
                              onChange={(e) => {
                                if (e.target.checked && meal.recipe)
                                  setEntries(
                                    addEntry(
                                      day.date,
                                      meal.slot,
                                      meal.recipe.name,
                                      meal.kcal,
                                      mealSourceKey(day.date, meal.slot),
                                    ),
                                  );
                                else if (logged)
                                  setEntries(removeEntry(logged.id));
                              }}
                            />
                            {day.date > today
                              ? "Log when eaten"
                              : "Eaten · add to diary"}
                          </label>
                          <button
                            disabled={!!logged || meal.alternatives < 2}
                            onClick={() =>
                              update({
                                ...prefs,
                                swaps: {
                                  ...prefs.swaps,
                                  [`${day.date}:${meal.slot}`]:
                                    (prefs.swaps[`${day.date}:${meal.slot}`] ??
                                      0) + 1,
                                },
                              })
                            }
                            aria-label={`Swap ${meal.slot} for ${day.date}`}
                            className="rounded-lg border border-mist px-3 py-2 text-xs disabled:opacity-40"
                          >
                            Swap
                          </button>
                        </div>
                      )}
                    </article>
                  );
                })}
                <p className="text-xs text-ink/50">
                  Serving estimates can differ from your target, especially with
                  saved meals or excluded foods. Add any extra food you eat in
                  the diary.
                </p>
              </div>
            </details>
          );
        })}
      </section>
    </main>
  );
}
function DailyMealForm({
  prefs,
  onSave,
}: {
  prefs: MealPreferences;
  onSave: (r: MealRecipe) => void;
}) {
  const [name, setName] = useState("");
  const [meal, setMeal] = useState<MealSlot>("breakfast");
  const [kcal, setKcal] = useState("");
  const [protein, setProtein] = useState("");
  const [portion, setPortion] = useState("");
  const [ingredients, setIngredients] = useState<FoodId[]>([]);
  const [budget, setBudget] = useState(false);
  const [message, setMessage] = useState("");
  function save() {
    const recipe: MealRecipe = {
      id: `custom-${meal}`,
      name: name.trim(),
      meal,
      kcal: Number(kcal),
      protein: protein.trim() === "" ? 0 : Number(protein),
      portion: portion.trim() || "Your usual serving",
      ingredients,
      budget,
      mind: false,
      custom: true,
      method:
        "Prepare your usual meal. Calories and protein use the estimates you entered.",
    };
    if (!validDailyMeal(recipe)) {
      setMessage(
        "Enter a meal name, 100–2,000 estimated calories, 0–150 g protein, and at least one listed ingredient.",
      );
      return;
    }
    if (!recipeFits(recipe, prefs)) {
      setMessage(
        "This meal conflicts with your excluded foods, vegetarian choice, or lower-cost preference. Adjust the meal or preferences first.",
      );
      return;
    }
    onSave(recipe);
    setMessage("Daily meal saved. It now fills this slot throughout the week.");
  }
  return (
    <div className="mt-4 space-y-3 border-t border-mist pt-4">
      <label className="block text-sm">
        Daily meal name
        <input
          className={input}
          value={name}
          maxLength={120}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <label className="block text-sm">
        Meal slot
        <select
          className={input}
          value={meal}
          onChange={(e) => setMeal(e.target.value as MealSlot)}
        >
          {MEAL_SLOTS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
      {prefs.dailyMeals[meal] && (
        <p className="text-xs text-ink/55">
          Saving will replace your current daily {meal}:{" "}
          {prefs.dailyMeals[meal]!.name}.
        </p>
      )}
      <label className="block text-sm">
        What's in one serving?
        <input
          className={input}
          value={portion}
          maxLength={200}
          onChange={(e) => setPortion(e.target.value)}
          placeholder="e.g. one bowl of oats with a banana"
        />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="block text-sm">
          Estimated calories
          <input
            className={input}
            type="number"
            min="100"
            max="2000"
            value={kcal}
            onChange={(e) => setKcal(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          Protein (g, optional)
          <input
            className={input}
            type="number"
            min="0"
            max="150"
            value={protein}
            onChange={(e) => setProtein(e.target.value)}
          />
        </label>
      </div>
      <details>
        <summary className="cursor-pointer text-sm">
          Select its ingredients ({ingredients.length})
        </summary>
        <p className="mt-2 text-xs text-ink/55">
          Select every listed food it contains so your exclusions can be
          applied. Check other ingredients separately.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {FOOD_OPTIONS.map(([id, label]) => (
            <label key={id} className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={ingredients.includes(id)}
                aria-label={`Daily meal contains ${label}`}
                onChange={(e) =>
                  setIngredients(
                    e.target.checked
                      ? [...ingredients, id]
                      : ingredients.filter((x) => x !== id),
                  )
                }
              />
              {label}
            </label>
          ))}
        </div>
      </details>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={budget}
          onChange={(e) => setBudget(e.target.checked)}
        />
        This is a lower-cost meal for me
      </label>
      <button
        onClick={save}
        className="w-full rounded-xl bg-moss px-4 py-3 text-sm font-medium text-paper"
      >
        Save daily meal
      </button>
      {message && (
        <p role="status" className="text-sm text-moss">
          {message}
        </p>
      )}
    </div>
  );
}
