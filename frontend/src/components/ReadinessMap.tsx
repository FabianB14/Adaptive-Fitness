const ZONES: { id: string; label: string; x: number; y: number; w: number; h: number }[] = [
  { id: "cervical", label: "Neck", x: 62, y: 0, w: 36, h: 16 },
  { id: "shoulder_l", label: "Shoulders", x: 22, y: 22, w: 34, h: 20 },
  { id: "thoracic", label: "Upper back", x: 62, y: 22, w: 36, h: 26 },
  { id: "shoulder_r", label: "Shoulders", x: 104, y: 22, w: 34, h: 20 },
  { id: "elbow_l", label: "Elbows", x: 22, y: 48, w: 26, h: 16 },
  { id: "lumbar", label: "Lower back", x: 62, y: 54, w: 36, h: 22 },
  { id: "elbow_r", label: "Elbows", x: 112, y: 48, w: 26, h: 16 },
  { id: "wrist_l", label: "Wrists", x: 22, y: 70, w: 20, h: 12 },
  { id: "hip", label: "Hips", x: 58, y: 82, w: 44, h: 18 },
  { id: "wrist_r", label: "Wrists", x: 118, y: 70, w: 20, h: 12 },
  { id: "knee_l", label: "Knees", x: 52, y: 106, w: 24, h: 18 },
  { id: "knee_r", label: "Knees", x: 84, y: 106, w: 24, h: 18 },
  { id: "ankle_l", label: "Ankles", x: 52, y: 130, w: 24, h: 14 },
  { id: "ankle_r", label: "Ankles", x: 84, y: 130, w: 24, h: 14 },
];

/**
 * The Readiness Map — the home screen's anchor. Labeled geometric zones
 * arranged anatomically: a diagram of systems, deliberately not a picture
 * of a body. Zones tint by state: moss = clear, ochre = easing,
 * mist = suppressed.
 *
 * Step-1 scaffold: every zone renders "clear" (constraint engine arrives in
 * build steps 3–5). Tap-to-explain lands with the engine.
 */
export function ReadinessMap() {
  return (
    <figure className="animate-draw-in">
      <svg
        viewBox="0 0 160 148"
        role="img"
        aria-label="Readiness map: all regions clear"
        className="mx-auto w-44"
      >
        {ZONES.map((z, i) => (
          <rect
            key={z.id}
            x={z.x}
            y={z.y}
            width={z.w}
            height={z.h}
            rx="5"
            className="fill-moss/80"
            style={{
              animation: `draw-in 0.5s ease-out both`,
              animationDelay: `${i * 40}ms`,
            }}
          >
            <title>{`${z.label} — clear`}</title>
          </rect>
        ))}
      </svg>
      <figcaption className="mt-3 text-center text-sm text-ink/60">
        All regions clear
      </figcaption>
    </figure>
  );
}
