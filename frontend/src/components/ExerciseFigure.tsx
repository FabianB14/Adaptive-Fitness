import { type Exercise } from "../lib/library";

/**
 * Original line-figure pose illustrations — one glyph per movement
 * archetype, mapped from an exercise's pattern + position. Stroke-only,
 * palette-tinted, no faces, no physiques: they show HOW a movement goes,
 * not what a body should look like.
 */
type Glyph =
  | "squat" | "chairsit" | "hinge" | "bridge" | "pushup" | "benchpress"
  | "overhead" | "row" | "pulldown" | "carry" | "twist" | "walk" | "run"
  | "bike" | "plank" | "birddog" | "deadbug" | "stretchstand" | "stretchseat"
  | "cat";

export function glyphFor(e: Exercise): Glyph {
  const p = e.position;
  switch (e.movement_pattern) {
    case "squat":
      return p === "seated" ? "chairsit" : "squat";
    case "hinge":
      return p === "supine" ? "bridge" : p === "prone" ? "birddog" : "hinge";
    case "push_h":
      return p === "supine" ? "benchpress" : p === "seated" ? "row" : "pushup";
    case "push_v":
      return "overhead";
    case "pull_h":
      return "row";
    case "pull_v":
      return "pulldown";
    case "carry":
      return "carry";
    case "rotate":
      return "twist";
    case "gait":
      if (p === "seated") return "bike";
      return e.impact_level === "moderate" || e.impact_level === "high"
        ? "run"
        : "walk";
    case "core":
      return p === "supine"
        ? "deadbug"
        : p === "quadruped"
          ? "birddog"
          : p === "prone"
            ? "plank"
            : "chairsit";
    case "mobility":
      return p === "quadruped"
        ? "cat"
        : p === "standing"
          ? "stretchstand"
          : "stretchseat";
    default:
      return "walk";
  }
}

const HEAD = (cx: number, cy: number) => (
  <circle cx={cx} cy={cy} r="7" fill="none" />
);

const GLYPHS: Record<Glyph, React.ReactNode> = {
  walk: (
    <>
      {HEAD(46, 18)}
      <path d="M46 26 48 54" />
      <path d="M48 54 32 84 M48 54 62 80" />
      <path d="M47 34 32 48 M47 34 60 46" />
    </>
  ),
  run: (
    <>
      {HEAD(50, 15)}
      <path d="M50 23 58 48" />
      <path d="M58 48 34 66 26 86 M58 48 74 66 66 84" />
      <path d="M53 32 72 38 M53 32 34 26" />
    </>
  ),
  bike: (
    <>
      {HEAD(60, 22)}
      <circle cx="30" cy="74" r="11" fill="none" />
      <circle cx="74" cy="74" r="11" fill="none" />
      <path d="M60 29 48 56 30 74 M48 56 74 74" />
      <path d="M48 56 46 72" />
      <path d="M59 36 74 48" />
    </>
  ),
  squat: (
    <>
      {HEAD(48, 22)}
      <path d="M48 29 44 52" />
      <path d="M44 52 62 60 58 84" />
      <path d="M46 36 68 40" />
    </>
  ),
  chairsit: (
    <>
      {HEAD(44, 22)}
      <path d="M44 29 44 56" />
      <path d="M44 56 62 56 62 84" />
      <path d="M30 36 30 86 M30 62 70 62" />
      <path d="M44 38 58 46" />
    </>
  ),
  hinge: (
    <>
      {HEAD(32, 30)}
      <path d="M36 36 58 52" />
      <path d="M58 52 56 84" />
      <path d="M44 42 42 62" />
    </>
  ),
  bridge: (
    <>
      {HEAD(18, 76)}
      <path d="M26 74 52 58 64 66 64 86" />
      <path d="M14 88 86 88" />
    </>
  ),
  pushup: (
    <>
      {HEAD(78, 50)}
      <path d="M70 54 30 68 24 82" />
      <path d="M64 56 64 80" />
      <path d="M14 84 86 84" />
    </>
  ),
  benchpress: (
    <>
      {HEAD(74, 62)}
      <path d="M66 64 30 64" />
      <path d="M52 64 52 42 M38 42 68 42" />
      <path d="M24 70 80 70" />
    </>
  ),
  overhead: (
    <>
      {HEAD(50, 22)}
      <path d="M50 29 50 58" />
      <path d="M50 58 40 85 M50 58 60 85" />
      <path d="M50 36 36 16 M50 36 64 16" />
    </>
  ),
  row: (
    <>
      {HEAD(32, 30)}
      <path d="M36 36 58 52 56 84" />
      <path d="M44 42 46 62" />
      <circle cx="46" cy="68" r="4.5" fill="none" />
    </>
  ),
  pulldown: (
    <>
      {HEAD(50, 28)}
      <path d="M50 35 50 60 66 60 66 84" />
      <path d="M50 40 36 22 M50 40 64 22" />
      <path d="M28 16 72 16" />
    </>
  ),
  carry: (
    <>
      {HEAD(50, 18)}
      <path d="M50 25 50 54" />
      <path d="M50 54 38 84 M50 54 62 82" />
      <path d="M50 32 36 50 M50 32 64 50" />
      <circle cx="35" cy="56" r="4.5" fill="none" />
      <circle cx="65" cy="56" r="4.5" fill="none" />
    </>
  ),
  twist: (
    <>
      {HEAD(50, 20)}
      <path d="M50 27 50 58" />
      <path d="M50 58 40 85 M50 58 60 85" />
      <path d="M30 42 Q50 30 72 36" />
    </>
  ),
  plank: (
    <>
      {HEAD(78, 54)}
      <path d="M70 57 28 68 24 82" />
      <path d="M64 60 64 78 50 78" />
      <path d="M14 84 86 84" />
    </>
  ),
  birddog: (
    <>
      {HEAD(72, 48)}
      <path d="M32 55 64 55" />
      <path d="M38 55 38 80 M56 55 56 80" />
      <path d="M32 55 14 46 M64 55 84 46" />
    </>
  ),
  deadbug: (
    <>
      {HEAD(20, 68)}
      <path d="M28 72 66 72" />
      <path d="M40 72 40 46" />
      <path d="M58 72 58 54 72 48" />
      <path d="M12 80 88 80" />
    </>
  ),
  stretchstand: (
    <>
      {HEAD(50, 20)}
      <path d="M50 27 Q54 44 52 58" />
      <path d="M52 58 42 85 M52 58 62 85" />
      <path d="M51 32 32 18" />
    </>
  ),
  stretchseat: (
    <>
      {HEAD(34, 40)}
      <path d="M40 48 58 64 86 64" />
      <path d="M44 52 70 60" />
      <path d="M14 70 90 70" />
    </>
  ),
  cat: (
    <>
      {HEAD(72, 54)}
      <path d="M32 58 Q48 42 64 56" />
      <path d="M36 58 36 80 M58 57 58 80" />
    </>
  ),
};

export function ExerciseFigure({
  exercise,
  className = "h-11 w-11",
}: {
  exercise: Exercise;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 100 100"
      aria-hidden="true"
      className={`shrink-0 stroke-ink/50 ${className}`}
      style={{ strokeWidth: 5.5, strokeLinecap: "round", strokeLinejoin: "round", fill: "none" }}
    >
      {GLYPHS[glyphFor(exercise)]}
    </svg>
  );
}
