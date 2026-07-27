import { type Exercise } from "../lib/library";

/**
 * Original line-figure pose illustrations — every movement archetype now
 * has TWO frames: where the movement starts and where it goes (standing →
 * squatting down, lying flat → bridged up). The frames alternate slowly;
 * with reduced motion the end pose shows as a static ghost instead.
 * Stroke-only, palette-tinted, no faces, no physiques: they show HOW a
 * movement goes, not what a body should look like.
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

interface Frames {
  a: React.ReactNode; // start position
  b: React.ReactNode; // end position
}

const GLYPHS: Record<Glyph, Frames> = {
  walk: {
    a: (
      <>
        {HEAD(46, 18)}
        <path d="M46 26 48 54" />
        <path d="M48 54 32 84 M48 54 62 80" />
        <path d="M47 34 32 48 M47 34 60 46" />
      </>
    ),
    b: (
      <>
        {HEAD(46, 18)}
        <path d="M46 26 48 54" />
        <path d="M48 54 62 84 M48 54 34 80" />
        <path d="M47 34 62 48 M47 34 34 46" />
      </>
    ),
  },
  run: {
    a: (
      <>
        {HEAD(50, 15)}
        <path d="M50 23 58 48" />
        <path d="M58 48 34 66 26 86 M58 48 74 66 66 84" />
        <path d="M53 32 72 38 M53 32 34 26" />
      </>
    ),
    b: (
      <>
        {HEAD(50, 15)}
        <path d="M50 23 58 48" />
        <path d="M58 48 72 62 62 84 M58 48 40 62 30 78" />
        <path d="M53 32 70 26 M53 32 36 40" />
      </>
    ),
  },
  bike: {
    a: (
      <>
        {HEAD(60, 22)}
        <circle cx="30" cy="74" r="11" fill="none" />
        <circle cx="74" cy="74" r="11" fill="none" />
        <path d="M60 29 48 56 30 74 M48 56 74 74" />
        <path d="M48 56 46 72" />
        <path d="M59 36 74 48" />
      </>
    ),
    b: (
      <>
        {HEAD(60, 22)}
        <circle cx="30" cy="74" r="11" fill="none" />
        <circle cx="74" cy="74" r="11" fill="none" />
        <path d="M60 29 48 56 30 74 M48 56 74 74" />
        <path d="M48 56 56 66" />
        <path d="M59 36 74 48" />
      </>
    ),
  },
  squat: {
    a: (
      <>
        {HEAD(48, 16)}
        <path d="M48 23 48 52" />
        <path d="M48 52 40 84 M48 52 58 84" />
        <path d="M48 32 66 36" />
      </>
    ),
    b: (
      <>
        {HEAD(48, 22)}
        <path d="M48 29 44 52" />
        <path d="M44 52 62 60 58 84" />
        <path d="M46 36 68 40" />
      </>
    ),
  },
  chairsit: {
    a: (
      <>
        {HEAD(50, 16)}
        <path d="M50 23 50 54" />
        <path d="M50 54 44 84 M50 54 58 84" />
        <path d="M30 36 30 86 M30 62 70 62" />
        <path d="M50 32 62 40" />
      </>
    ),
    b: (
      <>
        {HEAD(44, 22)}
        <path d="M44 29 44 56" />
        <path d="M44 56 62 56 62 84" />
        <path d="M30 36 30 86 M30 62 70 62" />
        <path d="M44 38 58 46" />
      </>
    ),
  },
  hinge: {
    a: (
      <>
        {HEAD(56, 16)}
        <path d="M56 23 57 52" />
        <path d="M57 52 56 84" />
        <path d="M56 32 54 54" />
      </>
    ),
    b: (
      <>
        {HEAD(32, 30)}
        <path d="M36 36 58 52" />
        <path d="M58 52 56 84" />
        <path d="M44 42 42 62" />
      </>
    ),
  },
  bridge: {
    a: (
      <>
        {HEAD(18, 80)}
        <path d="M26 80 52 80" />
        <path d="M52 80 64 66 64 86" />
        <path d="M14 88 86 88" />
      </>
    ),
    b: (
      <>
        {HEAD(18, 76)}
        <path d="M26 74 52 58 64 66 64 86" />
        <path d="M14 88 86 88" />
      </>
    ),
  },
  pushup: {
    a: (
      <>
        {HEAD(78, 42)}
        <path d="M70 46 28 60 22 78" />
        <path d="M62 48 62 80" />
        <path d="M14 84 86 84" />
      </>
    ),
    b: (
      <>
        {HEAD(78, 60)}
        <path d="M70 63 28 70 22 82" />
        <path d="M62 65 52 78 64 80" />
        <path d="M14 84 86 84" />
      </>
    ),
  },
  benchpress: {
    a: (
      <>
        {HEAD(74, 62)}
        <path d="M66 64 30 64" />
        <path d="M52 64 52 54 M38 54 68 54" />
        <path d="M24 70 80 70" />
      </>
    ),
    b: (
      <>
        {HEAD(74, 62)}
        <path d="M66 64 30 64" />
        <path d="M52 64 52 42 M38 42 68 42" />
        <path d="M24 70 80 70" />
      </>
    ),
  },
  overhead: {
    a: (
      <>
        {HEAD(50, 22)}
        <path d="M50 29 50 58" />
        <path d="M50 58 40 85 M50 58 60 85" />
        <path d="M50 38 36 32 M50 38 64 32" />
      </>
    ),
    b: (
      <>
        {HEAD(50, 22)}
        <path d="M50 29 50 58" />
        <path d="M50 58 40 85 M50 58 60 85" />
        <path d="M50 36 36 16 M50 36 64 16" />
      </>
    ),
  },
  row: {
    a: (
      <>
        {HEAD(32, 30)}
        <path d="M36 36 58 52 56 84" />
        <path d="M44 42 46 62" />
        <circle cx="46" cy="68" r="4.5" fill="none" />
      </>
    ),
    b: (
      <>
        {HEAD(32, 30)}
        <path d="M36 36 58 52 56 84" />
        <path d="M44 42 40 54" />
        <circle cx="39" cy="60" r="4.5" fill="none" />
      </>
    ),
  },
  pulldown: {
    a: (
      <>
        {HEAD(50, 28)}
        <path d="M50 35 50 60 66 60 66 84" />
        <path d="M50 40 36 22 M50 40 64 22" />
        <path d="M28 16 72 16" />
      </>
    ),
    b: (
      <>
        {HEAD(50, 28)}
        <path d="M50 35 50 60 66 60 66 84" />
        <path d="M50 42 36 48 M50 42 64 48" />
        <path d="M28 50 72 50" />
      </>
    ),
  },
  carry: {
    a: (
      <>
        {HEAD(50, 18)}
        <path d="M50 25 50 54" />
        <path d="M50 54 38 84 M50 54 62 82" />
        <path d="M50 32 36 50 M50 32 64 50" />
        <circle cx="35" cy="56" r="4.5" fill="none" />
        <circle cx="65" cy="56" r="4.5" fill="none" />
      </>
    ),
    b: (
      <>
        {HEAD(50, 18)}
        <path d="M50 25 50 54" />
        <path d="M50 54 62 84 M50 54 38 82" />
        <path d="M50 32 36 50 M50 32 64 50" />
        <circle cx="35" cy="56" r="4.5" fill="none" />
        <circle cx="65" cy="56" r="4.5" fill="none" />
      </>
    ),
  },
  twist: {
    a: (
      <>
        {HEAD(50, 20)}
        <path d="M50 27 50 58" />
        <path d="M50 58 40 85 M50 58 60 85" />
        <path d="M30 42 Q50 30 72 36" />
      </>
    ),
    b: (
      <>
        {HEAD(50, 20)}
        <path d="M50 27 50 58" />
        <path d="M50 58 40 85 M50 58 60 85" />
        <path d="M70 42 Q50 30 28 36" />
      </>
    ),
  },
  plank: {
    // A hold — both frames identical on purpose; stillness is the exercise.
    a: (
      <>
        {HEAD(78, 54)}
        <path d="M70 57 28 68 24 82" />
        <path d="M64 60 64 78 50 78" />
        <path d="M14 84 86 84" />
      </>
    ),
    b: (
      <>
        {HEAD(78, 54)}
        <path d="M70 57 28 68 24 82" />
        <path d="M64 60 64 78 50 78" />
        <path d="M14 84 86 84" />
      </>
    ),
  },
  birddog: {
    a: (
      <>
        {HEAD(72, 48)}
        <path d="M32 55 64 55" />
        <path d="M38 55 38 80 M56 55 56 80" />
        <path d="M32 55 32 80 M64 55 64 80" />
      </>
    ),
    b: (
      <>
        {HEAD(72, 48)}
        <path d="M32 55 64 55" />
        <path d="M38 55 38 80 M56 55 56 80" />
        <path d="M32 55 14 46 M64 55 84 46" />
      </>
    ),
  },
  deadbug: {
    a: (
      <>
        {HEAD(20, 68)}
        <path d="M28 72 66 72" />
        <path d="M40 72 40 46" />
        <path d="M58 72 58 54 68 54" />
        <path d="M12 80 88 80" />
      </>
    ),
    b: (
      <>
        {HEAD(20, 68)}
        <path d="M28 72 66 72" />
        <path d="M40 72 40 46" />
        <path d="M58 72 58 54 72 48" />
        <path d="M12 80 88 80" />
      </>
    ),
  },
  stretchstand: {
    a: (
      <>
        {HEAD(50, 20)}
        <path d="M50 27 50 58" />
        <path d="M50 58 42 85 M50 58 60 85" />
        <path d="M50 34 42 50" />
      </>
    ),
    b: (
      <>
        {HEAD(50, 20)}
        <path d="M50 27 Q54 44 52 58" />
        <path d="M52 58 42 85 M52 58 62 85" />
        <path d="M51 32 32 18" />
      </>
    ),
  },
  stretchseat: {
    a: (
      <>
        {HEAD(44, 28)}
        <path d="M46 35 50 58 64 64 88 64" />
        <path d="M47 42 58 52" />
        <path d="M14 70 90 70" />
      </>
    ),
    b: (
      <>
        {HEAD(34, 40)}
        <path d="M40 48 58 64 86 64" />
        <path d="M44 52 70 60" />
        <path d="M14 70 90 70" />
      </>
    ),
  },
  cat: {
    a: (
      <>
        {HEAD(72, 54)}
        <path d="M32 58 Q48 42 64 56" />
        <path d="M36 58 36 80 M58 57 58 80" />
      </>
    ),
    b: (
      <>
        {HEAD(72, 50)}
        <path d="M32 58 Q48 68 64 56" />
        <path d="M36 58 36 80 M58 57 58 80" />
      </>
    ),
  },
};

export function ExerciseFigure({
  exercise,
  className = "h-11 w-11",
}: {
  exercise: Exercise;
  className?: string;
}) {
  const frames = GLYPHS[glyphFor(exercise)];
  return (
    <svg
      viewBox="0 0 100 100"
      aria-hidden="true"
      className={`shrink-0 stroke-ink/50 ${className}`}
      style={{ strokeWidth: 5.5, strokeLinecap: "round", strokeLinejoin: "round", fill: "none" }}
    >
      <g className="af-pose-a">{frames.a}</g>
      <g className="af-pose-b">{frames.b}</g>
    </svg>
  );
}
