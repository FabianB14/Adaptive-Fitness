import { addDays, mondayOf } from "./weekly";
import { type MealEntry, type NutritionGoal } from "./nutrition";
export type MealSlot = MealEntry["meal"];
export type EatingPattern =
  | "balanced"
  | "mind"
  | "mediterranean"
  | "vegetarian";
export const MEAL_SLOTS: { id: MealSlot; label: string }[] = [
  { id: "breakfast", label: "Breakfast" },
  { id: "lunch", label: "Lunch" },
  { id: "dinner", label: "Dinner" },
  { id: "snack", label: "Snack" },
];
export const EATING_PATTERNS: {
  id: EatingPattern;
  label: string;
  description: string;
}[] = [
  {
    id: "balanced",
    label: "Balanced everyday meals",
    description: "A mix of vegetables, grains, protein foods, and fruit.",
  },
  {
    id: "mind",
    label: "MIND-inspired",
    description:
      "Emphasizes leafy greens, berries, beans, whole grains, nuts, and olive oil. Meal ideas inspired by the pattern; no promise of preventing dementia.",
  },
  {
    id: "mediterranean",
    label: "Mediterranean-inspired",
    description:
      "Vegetables, legumes, whole grains, olive oil, and optional fish or poultry.",
  },
  {
    id: "vegetarian",
    label: "Vegetarian",
    description:
      "Plant protein, with eggs and dairy available unless you exclude them.",
  },
];
export const FOOD_OPTIONS = [
  ["oats", "Oats"],
  ["wholegrain", "Whole-grain bread / pasta"],
  ["rice", "Rice"],
  ["quinoa", "Quinoa"],
  ["beans", "Beans"],
  ["lentils", "Lentils"],
  ["chickpeas", "Chickpeas"],
  ["chicken", "Chicken"],
  ["turkey", "Turkey"],
  ["fish", "Fish"],
  ["tofu", "Tofu / soy"],
  ["eggs", "Eggs"],
  ["dairy", "Milk / yogurt / cheese"],
  ["nuts", "Tree nuts"],
  ["peanut", "Peanuts / peanut butter"],
  ["seeds", "Seeds"],
  ["berries", "Berries"],
  ["banana", "Banana"],
  ["apple", "Apple"],
  ["greens", "Leafy greens"],
  ["broccoli", "Broccoli"],
  ["tomato", "Tomato"],
  ["carrot", "Carrots"],
  ["sweetpotato", "Sweet potato"],
  ["avocado", "Avocado"],
  ["oliveoil", "Olive oil"],
] as const;
export type FoodId = (typeof FOOD_OPTIONS)[number][0];
export const foodLabel = (id: FoodId) =>
  FOOD_OPTIONS.find((f) => f[0] === id)?.[1] ?? id;
export interface MealRecipe {
  id: string;
  name: string;
  meal: MealSlot;
  ingredients: FoodId[];
  portion: string;
  method: string;
  kcal: number;
  protein: number;
  budget: boolean;
  mind: boolean;
  custom?: boolean;
}
/** Approximate nutrition for the listed serving; brands and preparation change it. */
export const RECIPES: MealRecipe[] = [
  {
    id: "berry-oats",
    name: "Berry & seed oats",
    meal: "breakfast",
    ingredients: ["oats", "berries", "seeds"],
    portion: "½ cup dry oats, 1 cup berries, 2 tbsp seeds; cook with water",
    method:
      "Cook the oats, then add berries and seeds. Frozen berries work well.",
    kcal: 370,
    protein: 13,
    budget: true,
    mind: true,
  },
  {
    id: "peanut-oats",
    name: "Banana peanut oats",
    meal: "breakfast",
    ingredients: ["oats", "banana", "peanut"],
    portion: "½ cup dry oats, 1 banana, 2 tbsp peanut butter; water",
    method: "Cook the oats and stir in peanut butter. Slice banana on top.",
    kcal: 445,
    protein: 14,
    budget: true,
    mind: true,
  },
  {
    id: "eggs-toast",
    name: "Eggs, greens & toast",
    meal: "breakfast",
    ingredients: ["eggs", "wholegrain", "greens", "oliveoil"],
    portion:
      "2 eggs, 2 slices whole-grain toast, 1 cup greens, 1 tsp olive oil",
    method: "Wilt the greens in oil. Cook eggs until set and serve with toast.",
    kcal: 405,
    protein: 23,
    budget: true,
    mind: false,
  },
  {
    id: "yogurt-oats",
    name: "Yogurt, oats & berries",
    meal: "breakfast",
    ingredients: ["dairy", "oats", "berries"],
    portion: "1 cup plain Greek yogurt, ½ cup oats, 1 cup berries",
    method: "Mix and refrigerate overnight, or serve immediately.",
    kcal: 390,
    protein: 28,
    budget: true,
    mind: false,
  },
  {
    id: "tofu-toast",
    name: "Tofu scramble & toast",
    meal: "breakfast",
    ingredients: ["tofu", "wholegrain", "tomato", "oliveoil"],
    portion:
      "150 g tofu, 2 slices whole-grain toast, 1 tomato, 1 tsp olive oil",
    method: "Crumble and heat tofu with tomato and oil; serve on toast.",
    kcal: 430,
    protein: 27,
    budget: true,
    mind: true,
  },
  {
    id: "apple-nut-oats",
    name: "Apple & walnut oats",
    meal: "breakfast",
    ingredients: ["oats", "apple", "nuts"],
    portion: "½ cup dry oats, 1 apple, ¼ cup walnuts; water",
    method: "Cook oats with chopped apple; top with walnuts.",
    kcal: 440,
    protein: 12,
    budget: true,
    mind: true,
  },
  {
    id: "lentil-rice",
    name: "Lentil & greens rice bowl",
    meal: "lunch",
    ingredients: ["lentils", "rice", "greens", "carrot", "oliveoil"],
    portion:
      "1 cup cooked lentils, ¾ cup cooked brown rice, 1 cup vegetables, 2 tsp oil",
    method: "Batch-cook rice and lentils; warm with vegetables and oil.",
    kcal: 545,
    protein: 24,
    budget: true,
    mind: true,
  },
  {
    id: "chicken-rice",
    name: "Chicken & broccoli bowl",
    meal: "lunch",
    ingredients: ["chicken", "rice", "broccoli", "oliveoil"],
    portion:
      "120 g cooked chicken, 1 cup cooked brown rice, 1 cup broccoli, 2 tsp oil",
    method: "Cook chicken thoroughly, steam broccoli, and serve over rice.",
    kcal: 555,
    protein: 43,
    budget: true,
    mind: true,
  },
  {
    id: "chickpea-toast",
    name: "Chickpea salad on toast",
    meal: "lunch",
    ingredients: ["chickpeas", "wholegrain", "tomato", "greens", "oliveoil"],
    portion: "1 cup cooked chickpeas, 2 slices toast, 1 cup salad, 2 tsp oil",
    method: "Mash chickpeas with oil; pile onto toast with tomato and greens.",
    kcal: 555,
    protein: 22,
    budget: true,
    mind: true,
  },
  {
    id: "tofu-rice",
    name: "Tofu & vegetable rice",
    meal: "lunch",
    ingredients: ["tofu", "rice", "broccoli", "carrot", "oliveoil"],
    portion: "180 g tofu, 1 cup cooked brown rice, 1 cup vegetables, 2 tsp oil",
    method: "Pan-cook tofu and vegetables with oil; serve with rice.",
    kcal: 590,
    protein: 31,
    budget: true,
    mind: true,
  },
  {
    id: "fish-quinoa",
    name: "Fish & quinoa salad",
    meal: "lunch",
    ingredients: ["fish", "quinoa", "greens", "tomato", "oliveoil"],
    portion:
      "120 g cooked salmon, ¾ cup cooked quinoa, 2 cups greens and tomato, 2 tsp oil",
    method: "Cook salmon thoroughly. Serve over quinoa and salad with oil.",
    kcal: 550,
    protein: 34,
    budget: false,
    mind: true,
  },
  {
    id: "bean-potato",
    name: "Bean-stuffed sweet potato",
    meal: "lunch",
    ingredients: ["beans", "sweetpotato", "greens", "avocado"],
    portion: "1 large baked sweet potato, 1 cup beans, 1 cup greens, ¼ avocado",
    method: "Bake the potato and fill with warmed beans, greens, and avocado.",
    kcal: 570,
    protein: 21,
    budget: true,
    mind: true,
  },
  {
    id: "turkey-pasta",
    name: "Turkey & tomato pasta",
    meal: "dinner",
    ingredients: ["turkey", "wholegrain", "tomato", "greens", "oliveoil"],
    portion:
      "120 g cooked lean turkey, 1½ cups cooked whole-grain pasta, 1 cup tomato and greens, 2 tsp oil",
    method:
      "Cook turkey thoroughly, simmer with tomato, and combine with pasta and greens.",
    kcal: 650,
    protein: 43,
    budget: true,
    mind: true,
  },
  {
    id: "bean-stew",
    name: "Bean & vegetable stew with rice",
    meal: "dinner",
    ingredients: ["beans", "rice", "carrot", "tomato", "greens", "oliveoil"],
    portion:
      "1¼ cups beans, 1 cup cooked brown rice, 1½ cups vegetables, 2 tsp oil",
    method:
      "Simmer beans and vegetables with water until tender; serve over rice.",
    kcal: 650,
    protein: 26,
    budget: true,
    mind: true,
  },
  {
    id: "chicken-potato",
    name: "Chicken, sweet potato & greens",
    meal: "dinner",
    ingredients: ["chicken", "sweetpotato", "greens", "oliveoil"],
    portion:
      "150 g cooked chicken, 1 large sweet potato, 2 cups greens, 1 tbsp oil",
    method: "Roast chicken and potato until fully cooked; serve with greens.",
    kcal: 620,
    protein: 49,
    budget: true,
    mind: true,
  },
  {
    id: "salmon-rice",
    name: "Salmon, rice & broccoli",
    meal: "dinner",
    ingredients: ["fish", "rice", "broccoli", "oliveoil"],
    portion:
      "150 g cooked salmon, 1 cup cooked brown rice, 1½ cups broccoli, 1 tsp oil",
    method: "Bake salmon thoroughly and serve with rice and steamed broccoli.",
    kcal: 630,
    protein: 41,
    budget: false,
    mind: true,
  },
  {
    id: "lentil-pasta",
    name: "Lentil tomato pasta",
    meal: "dinner",
    ingredients: ["lentils", "wholegrain", "tomato", "greens", "oliveoil"],
    portion:
      "1 cup lentils, 1 cup cooked whole-grain pasta, 1 cup tomato and greens, 1 tbsp oil",
    method: "Simmer lentils with tomato; stir through pasta and greens.",
    kcal: 610,
    protein: 28,
    budget: true,
    mind: true,
  },
  {
    id: "tofu-quinoa",
    name: "Tofu, quinoa & broccoli",
    meal: "dinner",
    ingredients: ["tofu", "quinoa", "broccoli", "oliveoil"],
    portion: "200 g tofu, 1 cup cooked quinoa, 1½ cups broccoli, 2 tsp oil",
    method: "Pan-cook tofu and broccoli; serve with cooked quinoa.",
    kcal: 620,
    protein: 36,
    budget: false,
    mind: true,
  },
  {
    id: "apple-peanut",
    name: "Apple & peanut butter",
    meal: "snack",
    ingredients: ["apple", "peanut"],
    portion: "1 apple and 2 tbsp peanut butter",
    method: "Slice the apple and serve with peanut butter.",
    kcal: 285,
    protein: 8,
    budget: true,
    mind: true,
  },
  {
    id: "berry-yogurt",
    name: "Berry yogurt",
    meal: "snack",
    ingredients: ["berries", "dairy"],
    portion: "1 cup plain Greek yogurt and 1 cup berries",
    method: "Stir fresh or thawed berries into yogurt.",
    kcal: 225,
    protein: 23,
    budget: true,
    mind: false,
  },
  {
    id: "nuts-fruit",
    name: "Walnuts & berries",
    meal: "snack",
    ingredients: ["nuts", "berries"],
    portion: "¼ cup walnuts and 1 cup berries",
    method: "Pack separately for an easy snack.",
    kcal: 255,
    protein: 5,
    budget: true,
    mind: true,
  },
  {
    id: "chickpea-snack",
    name: "Roasted chickpeas & carrots",
    meal: "snack",
    ingredients: ["chickpeas", "carrot", "oliveoil"],
    portion: "¾ cup cooked chickpeas, 1 carrot, 1 tsp olive oil",
    method:
      "Roast well-drained chickpeas with oil until crisp. Serve with carrot sticks.",
    kcal: 275,
    protein: 11,
    budget: true,
    mind: true,
  },
  {
    id: "banana-seeds",
    name: "Banana & pumpkin seeds",
    meal: "snack",
    ingredients: ["banana", "seeds"],
    portion: "1 banana and ¼ cup pumpkin seeds",
    method: "A simple fruit and seed snack.",
    kcal: 285,
    protein: 10,
    budget: true,
    mind: true,
  },
  {
    id: "egg-toast",
    name: "Eggs on toast",
    meal: "snack",
    ingredients: ["eggs", "wholegrain"],
    portion: "2 fully cooked eggs and 1 slice whole-grain toast",
    method: "Slice cooked eggs onto toast.",
    kcal: 245,
    protein: 16,
    budget: true,
    mind: false,
  },
];
export interface MealPreferences {
  version: 1;
  pattern: EatingPattern;
  goal: NutritionGoal;
  budget: boolean;
  excluded: FoodId[];
  dailyMeals: Partial<Record<MealSlot, MealRecipe>>;
  swaps: Record<string, number>;
}
const KEY = "af.mealPlan.v1";
export function defaultMealPreferences(
  goal: NutritionGoal = "maintain",
): MealPreferences {
  return {
    version: 1,
    pattern: "balanced",
    goal,
    budget: false,
    excluded: [],
    dailyMeals: {},
    swaps: {},
  };
}
const isFood = (id: string): id is FoodId =>
  FOOD_OPTIONS.some((f) => f[0] === id);
export function validDailyMeal(meal: MealRecipe): boolean {
  return (
    !!meal &&
    typeof meal.name === "string" &&
    typeof meal.portion === "string" &&
    typeof meal.method === "string" &&
    meal.name.trim().length > 0 &&
    meal.name.length <= 120 &&
    Number.isFinite(meal.kcal) &&
    meal.kcal >= 100 &&
    meal.kcal <= 2000 &&
    Number.isFinite(meal.protein) &&
    meal.protein >= 0 &&
    meal.protein <= 150 &&
    Array.isArray(meal.ingredients) &&
    meal.ingredients.length > 0 &&
    meal.ingredients.every(isFood) &&
    MEAL_SLOTS.some((s) => s.id === meal.meal)
  );
}
export function loadMealPreferences(
  goal: NutritionGoal = "maintain",
): MealPreferences {
  const defaults = defaultMealPreferences(goal);
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (!saved || saved.version !== 1) return defaults;
    return {
      ...defaults,
      pattern: EATING_PATTERNS.some((p) => p.id === saved.pattern)
        ? saved.pattern
        : defaults.pattern,
      goal: ["maintain", "lose", "gain"].includes(saved.goal)
        ? saved.goal
        : goal,
      budget: saved.budget === true,
      excluded: Array.isArray(saved.excluded)
        ? saved.excluded.filter(isFood)
        : [],
      dailyMeals: Object.fromEntries(
        MEAL_SLOTS.flatMap(({ id }) =>
          validDailyMeal(saved.dailyMeals?.[id]) &&
          saved.dailyMeals[id].meal === id
            ? [[id, { ...saved.dailyMeals[id], custom: true }]]
            : [],
        ),
      ),
      swaps: Object.fromEntries(
        Object.entries(saved.swaps ?? {})
          .filter((entry): entry is [string, number] => {
            const [key, value] = entry;
            return (
              /^\d{4}-\d{2}-\d{2}:(breakfast|lunch|dinner|snack)$/.test(key) &&
              typeof value === "number" &&
              Number.isInteger(value) &&
              value >= 0
            );
          })
          .sort(([a], [b]) => a.localeCompare(b))
          .slice(-224),
      ),
    };
  } catch {
    return defaults;
  }
}
export function saveMealPreferences(value: MealPreferences): boolean {
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify({
        ...value,
        swaps: Object.fromEntries(
          Object.entries(value.swaps)
            .sort(([a], [b]) => a.localeCompare(b))
            .slice(-224),
        ),
      }),
    );
    return true;
  } catch {
    return false;
  }
}
// A starter menu emphasizing legumes, olive oil, fruit, and fish. Other foods
// can still fit this eating pattern; this set defines our suggested rotation.
const MEDITERRANEAN_RECIPES = new Set([
  "berry-oats",
  "eggs-toast",
  "yogurt-oats",
  "apple-nut-oats",
  "lentil-rice",
  "chicken-rice",
  "chickpea-toast",
  "fish-quinoa",
  "bean-potato",
  "turkey-pasta",
  "bean-stew",
  "salmon-rice",
  "lentil-pasta",
  "berry-yogurt",
  "nuts-fruit",
  "chickpea-snack",
  "banana-seeds",
]);
export function recipeFits(
  recipe: MealRecipe,
  prefs: MealPreferences,
): boolean {
  if (recipe.ingredients.some((id) => prefs.excluded.includes(id)))
    return false;
  if (prefs.budget && !recipe.budget) return false;
  if (
    prefs.pattern === "vegetarian" &&
    recipe.ingredients.some((id) => ["chicken", "turkey", "fish"].includes(id))
  )
    return false;
  if (prefs.pattern === "mediterranean")
    return recipe.custom === true || MEDITERRANEAN_RECIPES.has(recipe.id);
  return prefs.pattern !== "mind" || recipe.mind || recipe.custom === true;
}
export interface PlannedMeal {
  slot: MealSlot;
  recipe: MealRecipe | null;
  servings: number;
  kcal: number;
  protein: number;
  warning?: string;
  alternatives: number;
}
export interface MealDay {
  date: string;
  meals: PlannedMeal[];
  kcal: number;
  protein: number;
  complete: boolean;
  needsMoreFood: boolean;
}
export function generateMealDay(
  prefs: MealPreferences,
  date: string,
  targetKcal: number | null,
): MealDay {
  const dayNumber = Math.floor(Date.parse(`${date}T00:00:00Z`) / 86400000);
  const meals = MEAL_SLOTS.map(({ id }, index): PlannedMeal => {
    const custom = prefs.dailyMeals[id];
    const candidates = RECIPES.filter(
      (r) => r.meal === id && recipeFits(r, prefs),
    );
    const offset = prefs.swaps[`${date}:${id}`] ?? 0;
    const recipe =
      custom && recipeFits(custom, prefs)
        ? custom
        : (candidates[(dayNumber + index * 3 + offset) % candidates.length] ??
          null);
    return {
      slot: id,
      recipe,
      servings: 1,
      kcal: recipe?.kcal ?? 0,
      protein: recipe?.protein ?? 0,
      alternatives: custom && recipeFits(custom, prefs) ? 0 : candidates.length,
      warning:
        custom && !recipeFits(custom, prefs)
          ? "Your saved daily meal conflicts with these food or budget preferences, so it was left out."
          : undefined,
    };
  });
  const complete = meals.every((m) => m.recipe);
  const fixed = meals
    .filter((m) => m.recipe?.custom)
    .reduce((n, m) => n + m.kcal, 0);
  const base = meals
    .filter((m) => !m.recipe?.custom)
    .reduce((n, m) => n + m.kcal, 0);
  // Never reduce other meals to zero to compensate for a large saved meal.
  const scale =
    complete && targetKcal && base > 0
      ? Math.max(0.75, Math.min(2, (targetKcal - fixed) / base))
      : 1;
  meals.forEach((m) => {
    if (m.recipe && !m.recipe.custom) {
      m.servings = Math.round(scale * 100) / 100;
      m.kcal = Math.round(m.recipe.kcal * m.servings);
      m.protein = Math.round(m.recipe.protein * m.servings);
    }
  });
  return {
    date,
    meals,
    kcal: meals.reduce((n, m) => n + m.kcal, 0),
    protein: meals.reduce((n, m) => n + m.protein, 0),
    complete,
    needsMoreFood:
      meals.reduce((sum, meal) => sum + meal.kcal, 0) <
      (targetKcal ? Math.max(1200, targetKcal * 0.9) : 1500),
  };
}
export function generateMealWeek(
  prefs: MealPreferences,
  date: string,
  targetKcal: number | null,
): MealDay[] {
  const start = mondayOf(date);
  return Array.from({ length: 7 }, (_, i) =>
    generateMealDay(prefs, addDays(start, i), targetKcal),
  );
}
export const mealSourceKey = (date: string, slot: MealSlot) =>
  `meal-plan:${date}:${slot}`;
