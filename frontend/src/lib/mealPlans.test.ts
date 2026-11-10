import { afterEach, describe, expect, it, vi } from "vitest";
import { addEntry, loadEntries, removeEntry } from "./nutrition";
import {
  defaultMealPreferences,
  FOOD_OPTIONS,
  generateMealDay,
  generateMealWeek,
  loadMealPreferences,
  mealSourceKey,
  RECIPES,
  recipeFits,
  saveMealPreferences,
  validDailyMeal,
  type MealRecipe,
} from "./mealPlans";
const custom: MealRecipe = {
  id: "my-breakfast",
  name: "My breakfast",
  meal: "breakfast",
  ingredients: ["oats", "banana"],
  portion: "one bowl",
  method: "My usual preparation",
  kcal: 500,
  protein: 18,
  budget: true,
  mind: false,
  custom: true,
};
const storage = () => {
  const map = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => map.set(key, value),
    removeItem: (key: string) => map.delete(key),
  });
};
afterEach(() => vi.unstubAllGlobals());
describe("meal planning", () => {
  it("offers distinct MIND and Mediterranean starter rotations", () => {
    const prefs = defaultMealPreferences();
    const balanced = RECIPES.filter((r) => recipeFits(r, prefs));
    const mind = RECIPES.filter((r) =>
      recipeFits(r, { ...prefs, pattern: "mind" }),
    );
    const mediterranean = RECIPES.filter((r) =>
      recipeFits(r, { ...prefs, pattern: "mediterranean" }),
    );
    expect(mind.every((r) => r.mind)).toBe(true);
    expect(mind).not.toEqual(balanced);
    expect(mediterranean).not.toEqual(balanced);
    expect(mediterranean).not.toEqual(mind);
    expect(mediterranean.some((r) => r.ingredients.includes("fish"))).toBe(
      true,
    );
  });
  it("honors ingredient exclusions and lower-cost choices in all patterns", () => {
    for (const pattern of [
      "balanced",
      "mind",
      "mediterranean",
      "vegetarian",
    ] as const) {
      const prefs = {
        ...defaultMealPreferences(),
        pattern,
        budget: true,
        excluded: ["nuts", "peanut", "dairy", "fish"] as const,
      };
      const plan = generateMealWeek(
        { ...prefs, excluded: [...prefs.excluded] },
        "2026-11-10",
        2000,
      );
      expect(plan).toHaveLength(7);
      for (const day of plan) {
        expect(day.complete).toBe(true);
        for (const meal of day.meals) {
          expect(meal.recipe!.budget).toBe(true);
          expect(
            meal.recipe!.ingredients.some((id) =>
              prefs.excluded.includes(id as never),
            ),
          ).toBe(false);
          if (pattern === "vegetarian")
            expect(
              meal.recipe!.ingredients.some((id) =>
                ["chicken", "turkey", "fish"].includes(id),
              ),
            ).toBe(false);
        }
      }
    }
  });
  it("never fills an empty choice with an excluded meal", () => {
    const prefs = {
      ...defaultMealPreferences(),
      excluded: FOOD_OPTIONS.map((f) => f[0]),
    };
    const day = generateMealDay(prefs, "2026-11-10", 2000);
    expect(day.complete).toBe(false);
    expect(day.meals.every((m) => m.recipe === null)).toBe(true);
    expect(day.kcal).toBe(0);
  });
  it("keeps a daily favorite at its original serving in every day", () => {
    const prefs = {
      ...defaultMealPreferences("gain"),
      dailyMeals: { breakfast: custom },
    };
    for (const day of generateMealWeek(prefs, "2026-11-10", 3000)) {
      const breakfast = day.meals[0];
      expect(breakfast.recipe?.name).toBe("My breakfast");
      expect(breakfast.kcal).toBe(500);
      expect(breakfast.servings).toBe(1);
    }
  });
  it("removes a saved meal that conflicts with later exclusions", () => {
    const prefs = {
      ...defaultMealPreferences(),
      excluded: ["banana"] as const,
      dailyMeals: { breakfast: custom },
    };
    const meal = generateMealDay(
      { ...prefs, excluded: [...prefs.excluded] },
      "2026-11-10",
      2000,
    ).meals[0];
    expect(meal.warning).toContain("left out");
    expect(meal.recipe?.id).not.toBe(custom.id);
    expect(meal.recipe?.ingredients).not.toContain("banana");
  });
  it("swaps only the chosen date and meal and preserves restrictions", () => {
    const prefs = {
      ...defaultMealPreferences(),
      pattern: "mind" as const,
      budget: true,
    };
    const before = generateMealWeek(prefs, "2026-11-10", null);
    const updated = { ...prefs, swaps: { "2026-11-10:lunch": 1 } };
    const after = generateMealWeek(updated, "2026-11-10", null);
    expect(after[1].meals[1].recipe?.id).not.toBe(
      before[1].meals[1].recipe?.id,
    );
    expect(recipeFits(after[1].meals[1].recipe!, updated)).toBe(true);
    expect(after[0]).toEqual(before[0]);
    expect(after[1].meals[0]).toEqual(before[1].meals[0]);
  });
  it("uses standard servings without a target and scales complete menus conservatively", () => {
    const p = defaultMealPreferences();
    expect(
      generateMealDay(p, "2026-11-10", null).meals.every(
        (m) => m.servings === 1,
      ),
    ).toBe(true);
    const loss = generateMealDay(p, "2026-11-10", 1800);
    const gain = generateMealDay(p, "2026-11-10", 3000);
    expect(gain.kcal).toBeGreaterThan(loss.kcal);
    expect(gain.meals.every((m) => m.servings <= 2 && m.servings >= 0.75)).toBe(
      true,
    );
    expect(Math.abs(loss.kcal - 1800)).toBeLessThan(20);
  });
  it("flags a sparse custom menu instead of treating it as a full day's food", () => {
    const dailyMeals = Object.fromEntries(
      (["breakfast", "lunch", "dinner", "snack"] as const).map((meal) => [
        meal,
        { ...custom, meal, kcal: 100 },
      ]),
    );
    const day = generateMealDay(
      { ...defaultMealPreferences(), dailyMeals },
      "2026-11-10",
      null,
    );
    expect(day.kcal).toBe(400);
    expect(day.needsMoreFood).toBe(true);
    expect(
      generateMealDay(defaultMealPreferences(), "2026-11-10", 2000)
        .needsMoreFood,
    ).toBe(false);
  });
  it("validates custom nutrition values and ingredient selections", () => {
    expect(validDailyMeal(custom)).toBe(true);
    expect(validDailyMeal({ ...custom, kcal: NaN })).toBe(false);
    expect(validDailyMeal({ ...custom, kcal: -2 })).toBe(false);
    expect(validDailyMeal({ ...custom, ingredients: [] })).toBe(false);
  });
  it("restores preferences and discards invalid saved meals", () => {
    storage();
    const prefs = {
      ...defaultMealPreferences("gain"),
      dailyMeals: { breakfast: custom },
    };
    expect(saveMealPreferences(prefs)).toBe(true);
    expect(loadMealPreferences()).toEqual(prefs);
    localStorage.setItem(
      "af.mealPlan.v1",
      JSON.stringify({
        ...prefs,
        excluded: ["made-up"],
        dailyMeals: { breakfast: { ...custom, kcal: -10 } },
      }),
    );
    expect(loadMealPreferences().dailyMeals).toEqual({});
    expect(loadMealPreferences().excluded).toEqual([]);
  });
  it("logs a planned meal once and keeps its eaten value when menus change", () => {
    storage();
    const key = mealSourceKey("2026-11-10", "breakfast");
    const first = addEntry(
      "2026-11-10",
      "breakfast",
      "Original breakfast",
      500,
      key,
    );
    const second = addEntry(
      "2026-11-10",
      "breakfast",
      "Changed suggestion",
      650,
      key,
    );
    expect(second).toHaveLength(1);
    expect(loadEntries()[0].label).toBe("Original breakfast");
    removeEntry(first[0].id);
    expect(loadEntries()).toEqual([]);
    expect(
      addEntry("2026-11-10", "breakfast", "New breakfast", 600, key),
    ).toHaveLength(1);
  });
});
