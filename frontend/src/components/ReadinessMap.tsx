import { useState } from "react";
import { explainRegion, type Constraints } from "../lib/constraints";

const ZONES: { region: string; label: string; x: number; y: number; w: number; h: number }[] = [
  { region: "cervical", label: "Neck", x: 62, y: 0, w: 36, h: 16 },
  { region: "shoulder", label: "Shoulders", x: 22, y: 22, w: 34, h: 20 },
  { region: "thoracic", label: "Upper back", x: 62, y: 22, w: 36, h: 26 },
  { region: "shoulder", label: "Shoulders", x: 104, y: 22, w: 34, h: 20 },
  { region: "elbow", label: "Elbows", x: 22, y: 48, w: 26, h: 16 },
  { region: "lumbar", label: "Lower back", x: 62, y: 54, w: 36, h: 22 },
  { region: "elbow", label: "Elbows", x: 112, y: 48, w: 26, h: 16 },
  { region: "wrist", label: "Wrists", x: 22, y: 70, w: 20, h: 12 },
  { region: "hip", label: "Hips", x: 58, y: 82, w: 44, h: 18 },
  { region: "wrist", label: "Wrists", x: 118, y: 70, w: 20, h: 12 },
  { region: "knee", label: "Knees", x: 52, y: 106, w: 24, h: 18 },
  { region: "knee", label: "Knees", x: 84, y: 106, w: 24, h: 18 },
  { region: "ankle", label: "Ankles", x: 52, y: 130, w: 24, h: 14 },
  { region: "ankle", label: "Ankles", x: 84, y: 130, w: 24, h: 14 },
];

const STATE_FILL: Record<string, string> = {
  clear: "fill-moss/80",
  easing: "fill-ochre/75",
  suppressed: "fill-mist",
};

/**
 * The Readiness Map — labeled geometric zones arranged anatomically. A
 * diagram of systems, deliberately not a picture of a body. Zones tint by
 * constraint state: moss = clear, ochre = easing, mist = suppressed.
 * Tapping a zone explains why in one sentence.
 */
export function ReadinessMap({ constraints }: { constraints: Constraints }) {
  const [selected, setSelected] = useState<string | null>(null);

  const states = constraints.regions;
  const easing = Object.values(states).filter((s) => s === "easing").length;
  const suppressed = Object.values(states).filter((s) => s === "suppressed").length;

  const summary =
    suppressed === 0 && easing === 0
      ? "All regions clear"
      : [
          suppressed > 0 && `${suppressed} resting`,
          easing > 0 && `${easing} easing`,
        ]
          .filter(Boolean)
          .join(" · ");

  const caption = selected
    ? explainRegion(selected, states[selected] ?? "clear")
    : summary;

  return (
    <figure className="animate-draw-in">
      <svg
        viewBox="0 0 160 148"
        role="img"
        aria-label={`Readiness map: ${summary}`}
        className="mx-auto w-44"
      >
        {ZONES.map((z, i) => (
          <rect
            key={`${z.region}-${i}`}
            x={z.x}
            y={z.y}
            width={z.w}
            height={z.h}
            rx="5"
            tabIndex={0}
            role="button"
            aria-label={`${z.label}: ${states[z.region] ?? "clear"}`}
            onClick={() =>
              setSelected(selected === z.region ? null : z.region)
            }
            onKeyDown={(ev) => {
              if (ev.key === "Enter" || ev.key === " ") {
                ev.preventDefault();
                setSelected(selected === z.region ? null : z.region);
              }
            }}
            className={`cursor-pointer outline-offset-2 transition-opacity ${
              STATE_FILL[states[z.region] ?? "clear"]
            } ${selected && selected !== z.region ? "opacity-40" : ""}`}
            style={{
              animation: `draw-in 0.5s ease-out both`,
              animationDelay: `${i * 40}ms`,
            }}
          >
            <title>{`${z.label} — ${states[z.region] ?? "clear"}`}</title>
          </rect>
        ))}
      </svg>
      <figcaption className="mx-auto mt-3 min-h-10 max-w-xs text-center text-sm text-ink/60">
        {caption}
      </figcaption>
    </figure>
  );
}
