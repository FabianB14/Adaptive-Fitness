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
  | "cat" | "wallpush" | "seatedpress" | "seatedrow" | "lunge" | "legextension" | "supinestretch" | "breathing" | "seatedhold" | "seatedoverhead" | "seatedtwist" | "legcurl" | "kneelift" | "wheelchair" | "armcycle" | "rower";

export function glyphFor(e: Exercise): Glyph {
  const p = e.position;
  if (e.slug.includes("split-squat")) return "lunge";
  if (e.slug === "wall-push-up" || e.slug === "incline-push-up") return "wallpush";
  if (e.slug === "seated-leg-extension") return "legextension";
  if (e.slug === "seated-knee-lift") return "kneelift";
  if (e.slug === "seated-leg-curl") return "legcurl";
  if (e.slug === "wheelchair-propulsion-intervals") return "wheelchair";
  if (e.slug === "arm-ergometer") return "armcycle";
  if (e.slug === "rowing-machine") return "rower";
  if (e.slug === "seated-thoracic-rotation") return "seatedtwist";
  if (e.slug === "diaphragmatic-breathing") return "breathing";
  if (p === "seated" && e.movement_pattern === "carry") return "seatedhold";
  switch (e.movement_pattern) {
    case "squat":
      return p === "seated" ? "chairsit" : "squat";
    case "hinge":
      return p === "supine" ? "bridge" : p === "prone" ? "birddog" : "hinge";
    case "push_h":
      return p === "supine" ? "benchpress" : p === "seated" ? "seatedpress" : "pushup";
    case "push_v":
      return p === "seated" ? "seatedoverhead" : "overhead";
    case "pull_h":
      return p === "seated" ? "seatedrow" : "row";
    case "pull_v":
      return "pulldown";
    case "carry":
      return "carry";
    case "rotate":
      return p === "seated" ? "seatedtwist" : "twist";
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
      if (p === "supine") return "supinestretch";
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
  seatedoverhead: {
    a: <>{HEAD(44,24)}<path d="M44 32 44 60 66 60 66 84 M44 40 30 36 30 24 M44 40 58 36 58 24 M30 64 66 64" /></>,
    b: <>{HEAD(44,24)}<path d="M44 32 44 60 66 60 66 84 M44 40 30 24 30 12 M44 40 58 24 58 12 M30 64 66 64" /></>,
  },
  seatedtwist: {
    a: <>{HEAD(44,24)}<path d="M44 32 44 60 66 60 66 84 M44 40 28 40 36 48 M30 64 66 64" /></>,
    b: <>{HEAD(44,24)}<path d="M44 32 44 60 66 60 66 84 M44 40 60 40 52 48 M30 64 66 64" /></>,
  },
  legcurl: {
    a: <>{HEAD(34,20)}<path d="M34 28 34 58 58 58 82 64 M34 36 50 48 M24 62 62 62" /></>,
    b: <>{HEAD(34,20)}<path d="M34 28 34 58 58 58 48 82 M34 36 50 48 M24 62 62 62" /></>,
  },
  kneelift: {
    a: <>{HEAD(34,20)}<path d="M34 28 34 58 58 58 58 84 M34 36 50 48 M24 62 62 62" /></>,
    b: <>{HEAD(34,20)}<path d="M34 28 34 58 56 48 62 72 M34 36 50 48 M24 62 62 62" /></>,
  },
  wheelchair: {
    a: <>{HEAD(44,20)}<circle cx="38" cy="68" r="18" /><circle cx="76" cy="80" r="6" /><path d="M44 28 44 54 62 54 70 76 M44 36 26 46 24 66 M28 30 28 54 62 54" /></>,
    b: <>{HEAD(44,20)}<circle cx="38" cy="68" r="18" /><circle cx="76" cy="80" r="6" /><path d="M44 28 44 54 62 54 70 76 M44 36 52 52 54 72 M28 30 28 54 62 54" /></>,
  },
  armcycle: {
    a: <>{HEAD(32,20)}<path d="M32 28 32 58 52 58 52 84 M32 36 48 30 64 40 M64 40 64 82 M22 62 52 62" /><circle cx="64" cy="40" r="10" /></>,
    b: <>{HEAD(32,20)}<path d="M32 28 32 58 52 58 52 84 M32 36 46 50 64 40 M64 40 64 82 M22 62 52 62" /><circle cx="64" cy="40" r="10" /></>,
  },
  rower: {
    a: <>{HEAD(48,24)}<path d="M46 32 40 60 62 48 80 78 M46 38 68 44 M14 84 90 84" /></>,
    b: <>{HEAD(24,26)}<path d="M26 34 40 60 62 70 80 78 M28 40 24 52 40 50 M14 84 90 84" /></>,
  },
  wallpush: {
    a: <>{HEAD(45,20)}<path d="M46 28 40 56 30 84 M46 36 74 36 M80 12 80 88" /></>,
    b: <>{HEAD(62,20)}<path d="M62 28 46 56 30 84 M60 36 62 48 74 36 M80 12 80 88" /></>,
  },
  seatedpress: {
    a: <>{HEAD(38,20)}<path d="M38 28 38 58 58 58 58 84 M38 36 30 48 44 40 M25 32 25 88 M25 62 60 62" /></>,
    b: <>{HEAD(38,20)}<path d="M38 28 38 58 58 58 58 84 M38 36 56 36 74 36 M25 32 25 88 M25 62 60 62" /></>,
  },
  seatedrow: {
    a: <>{HEAD(38,20)}<path d="M38 28 38 58 58 58 58 84 M38 36 56 36 74 36 M25 62 60 62" /></>,
    b: <>{HEAD(38,20)}<path d="M38 28 38 58 58 58 58 84 M38 36 26 48 44 42 M25 62 60 62" /></>,
  },
  lunge: {
    a: <>{HEAD(48,16)}<path d="M48 24 48 50 M48 50 66 66 72 84 M48 50 30 66 24 84 M48 34 60 44" /></>,
    b: <>{HEAD(48,30)}<path d="M48 38 48 60 M48 60 68 60 72 84 M48 60 28 78 24 84 M48 46 60 54" /></>,
  },
  legextension: {
    a: <>{HEAD(34,20)}<path d="M34 28 34 58 56 58 56 84 M34 36 50 48 M24 62 60 62" /></>,
    b: <>{HEAD(34,20)}<path d="M34 28 34 58 56 58 82 58 M34 36 50 48 M24 62 60 62" /></>,
  },
  supinestretch: {
    a: <>{HEAD(20,72)}<path d="M28 76 56 76 68 54 82 76 M38 76 52 62 M12 86 90 86" /></>,
    b: <>{HEAD(20,72)}<path d="M28 76 56 76 50 48 72 60 M38 76 48 54 M12 86 90 86" /></>,
  },
  breathing: {
    a: <>{HEAD(20,72)}<path d="M28 76 56 76 68 54 82 76 M38 76 46 66 52 74 M12 86 90 86" /><path d="M42 56 Q48 50 54 56" /></>,
    b: <>{HEAD(20,72)}<path d="M28 76 56 76 68 54 82 76 M38 76 46 64 52 72 M12 86 90 86" /><path d="M38 52 Q48 40 58 52" /></>,
  },
  seatedhold: {
    a: <>{HEAD(44,20)}<path d="M44 28 44 58 64 58 64 84 M44 36 30 54 M24 62 66 62" /><circle cx="30" cy="60" r="4" /></>,
    b: <>{HEAD(44,20)}<path d="M44 28 44 58 64 58 64 84 M44 36 30 54 M24 62 66 62" /><circle cx="30" cy="60" r="4" /></>,
  },
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
  mode = "animate",
}: {
  exercise: Exercise;
  className?: string;
  mode?: "animate" | "pause" | "start" | "end";
}) {
  const frames = GLYPHS[glyphFor(exercise)];
  return (
    <svg
      viewBox="0 0 100 100"
      aria-hidden="true"
      className={`shrink-0 stroke-ink/50 ${className}`}
      style={{ strokeWidth: 5.5, strokeLinecap: "round", strokeLinejoin: "round", fill: "none" }}
    >
      {mode === "start" ? <g>{frames.a}</g> : mode === "end" ? <g>{frames.b}</g> : <>
        <g className="af-pose-a" style={{ animationPlayState: mode === "pause" ? "paused" : "running" }}>{frames.a}</g>
        <g className="af-pose-b" style={{ animationPlayState: mode === "pause" ? "paused" : "running" }}>{frames.b}</g>
      </>}
    </svg>
  );
}
