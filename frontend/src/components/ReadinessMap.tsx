import { useState } from "react";
import { explainRegion, type Constraints } from "../lib/constraints";

type Sex = "man" | "woman";
type View = "front" | "back";

interface Seg {
  key: string;
  /** Body region this segment selects; undefined = structural, not tappable. */
  region?: string;
  label?: string;
  shape:
    | { kind: "rect"; x: number; y: number; w: number; h: number; rx: number }
    | { kind: "circle"; cx: number; cy: number; r: number }
    | { kind: "ellipse"; cx: number; cy: number; rx: number; ry: number };
}

/** Original stylized figures built from region segments. Two sexes differ by
    proportion (shoulder vs hip width); front and back differ in which trunk
    zones are selectable — spine regions are honest: you tap them from behind. */
function segments(sex: Sex, view: View): Seg[] {
  const m = sex === "man";
  const back = view === "back";

  const shoulder = m
    ? { lx: 73, rx: 147, rxr: 21, ryr: 13 }
    : { lx: 77, rx: 143, rxr: 17, ryr: 12 };
  const chest = m ? { x: 82, w: 56 } : { x: 86, w: 48 };
  const abdomen = m ? { x: 87, w: 46 } : { x: 92, w: 36 };
  const pelvis = m ? { x: 83, w: 54, h: 26 } : { x: 79, w: 62, h: 28 };
  const armUpper = m ? { lx: 50, w: 17 } : { lx: 54, w: 15 };
  const armLower = m ? { lx: 51, w: 15 } : { lx: 55, w: 13 };
  const armC = m ? { l: 58.5, r: 161.5 } : { l: 61.5, r: 158.5 };
  const thigh = m ? { lx: 85, w: 23, rxx: 112 } : { lx: 82, w: 25, rxx: 113 };
  const legC = m ? { l: 96.5, r: 123.5 } : { l: 94.5, r: 125.5 };
  const shin = m ? { lx: 87.5, w: 18, rxx: 114.5 } : { lx: 86, w: 17, rxx: 117 };

  const mirrorArmUpperX = 220 - armUpper.lx - armUpper.w;
  const mirrorArmLowerX = 220 - armLower.lx - armLower.w;

  const segs: Seg[] = [
    { key: "head", shape: { kind: "ellipse", cx: 110, cy: 34, rx: m ? 19 : 18, ry: 23 } },
    { key: "neck", region: "cervical", label: "Neck", shape: { kind: "rect", x: 99, y: 55, w: 22, h: 16, rx: 6 } },
    { key: "sh-l", region: "shoulder", label: "Shoulders", shape: { kind: "ellipse", cx: shoulder.lx, cy: 84, rx: shoulder.rxr, ry: shoulder.ryr } },
    { key: "sh-r", region: "shoulder", label: "Shoulders", shape: { kind: "ellipse", cx: shoulder.rx, cy: 84, rx: shoulder.rxr, ry: shoulder.ryr } },
    {
      key: "chest",
      region: back ? "thoracic" : undefined,
      label: back ? "Upper back" : undefined,
      shape: { kind: "rect", x: chest.x, y: 74, w: chest.w, h: 54, rx: 16 },
    },
    {
      key: "abdomen",
      region: back ? "lumbar" : undefined,
      label: back ? "Lower back" : undefined,
      shape: { kind: "rect", x: abdomen.x, y: 128, w: abdomen.w, h: 38, rx: 12 },
    },
    { key: "pelvis", region: "hip", label: "Hips", shape: { kind: "rect", x: pelvis.x, y: 166, w: pelvis.w, h: pelvis.h, rx: 13 } },
    { key: "ua-l", shape: { kind: "rect", x: armUpper.lx, y: 92, w: armUpper.w, h: 46, rx: 8 } },
    { key: "ua-r", shape: { kind: "rect", x: mirrorArmUpperX, y: 92, w: armUpper.w, h: 46, rx: 8 } },
    { key: "el-l", region: "elbow", label: "Elbows", shape: { kind: "circle", cx: armC.l, cy: 146, r: m ? 9 : 8.5 } },
    { key: "el-r", region: "elbow", label: "Elbows", shape: { kind: "circle", cx: armC.r, cy: 146, r: m ? 9 : 8.5 } },
    { key: "fa-l", shape: { kind: "rect", x: armLower.lx, y: 153, w: armLower.w, h: 34, rx: 7 } },
    { key: "fa-r", shape: { kind: "rect", x: mirrorArmLowerX, y: 153, w: armLower.w, h: 34, rx: 7 } },
    { key: "wr-l", region: "wrist", label: "Wrists", shape: { kind: "circle", cx: armC.l, cy: 193, r: m ? 7.5 : 7 } },
    { key: "wr-r", region: "wrist", label: "Wrists", shape: { kind: "circle", cx: armC.r, cy: 193, r: m ? 7.5 : 7 } },
    { key: "hand-l", shape: { kind: "ellipse", cx: armC.l, cy: 206.5, rx: 7, ry: 8.5 } },
    { key: "hand-r", shape: { kind: "ellipse", cx: armC.r, cy: 206.5, rx: 7, ry: 8.5 } },
    { key: "th-l", shape: { kind: "rect", x: thigh.lx, y: 192, w: thigh.w, h: 58, rx: 11 } },
    { key: "th-r", shape: { kind: "rect", x: thigh.rxx, y: 192, w: thigh.w, h: 58, rx: 11 } },
    { key: "kn-l", region: "knee", label: "Knees", shape: { kind: "circle", cx: legC.l, cy: 257, r: m ? 10 : 9.5 } },
    { key: "kn-r", region: "knee", label: "Knees", shape: { kind: "circle", cx: legC.r, cy: 257, r: m ? 10 : 9.5 } },
    { key: "shin-l", shape: { kind: "rect", x: shin.lx, y: 266, w: shin.w, h: 50, rx: 9 } },
    { key: "shin-r", shape: { kind: "rect", x: shin.rxx, y: 266, w: shin.w, h: 50, rx: 9 } },
    { key: "an-l", region: "ankle", label: "Ankles", shape: { kind: "circle", cx: legC.l, cy: 321, r: 7.5 } },
    { key: "an-r", region: "ankle", label: "Ankles", shape: { kind: "circle", cx: legC.r, cy: 321, r: 7.5 } },
    { key: "foot-l", shape: { kind: "ellipse", cx: legC.l - 3.5, cy: 333, rx: 11, ry: 5.5 } },
    { key: "foot-r", shape: { kind: "ellipse", cx: legC.r + 3.5, cy: 333, rx: 11, ry: 5.5 } },
  ];
  return segs;
}

const STATE_FILL: Record<string, string> = {
  clear: "fill-moss/75",
  easing: "fill-ochre/75",
  suppressed: "fill-mist",
};

const SEX_KEY = "af.body.v1";

function loadSex(): Sex {
  try {
    return localStorage.getItem(SEX_KEY) === "woman" ? "woman" : "man";
  } catch {
    return "man";
  }
}

/**
 * The Readiness Map — a stylized human figure (man or woman, rotatable
 * front/back) whose regions tint by constraint state: moss = clear,
 * ochre = easing, mist = resting. Tap a part to hear why in one sentence.
 */
export function ReadinessMap({ constraints }: { constraints: Constraints }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [view, setView] = useState<View>("front");
  const [sex, setSex] = useState<Sex>(() => loadSex());

  const states = constraints.regions;
  const easing = Object.values(states).filter((s) => s === "easing").length;
  const suppressed = Object.values(states).filter((s) => s === "suppressed").length;
  const summary =
    suppressed === 0 && easing === 0
      ? "All regions clear — tap any body part"
      : [suppressed > 0 && `${suppressed} resting`, easing > 0 && `${easing} easing`]
          .filter(Boolean)
          .join(" · ");

  function pickSex(s: Sex) {
    setSex(s);
    try {
      localStorage.setItem(SEX_KEY, s);
    } catch {
      // Preference just won't persist.
    }
  }

  const renderFigure = (v: View) => (
    <svg
      viewBox="0 0 220 350"
      role="group"
      aria-label={`Body map, ${v} view: ${summary}`}
      className="h-full w-full"
    >
      {segments(sex, v).map((s) => {
        const tappable = s.region !== undefined;
        const state = tappable ? (states[s.region!] ?? "clear") : null;
        const cls = tappable
          ? `${STATE_FILL[state!]} cursor-pointer transition-opacity ${
              selected && selected !== s.region ? "opacity-40" : ""
            }`
          : "fill-ink/10";
        const interactive = tappable
          ? {
              tabIndex: 0,
              role: "button" as const,
              "aria-label": `${s.label}: ${state}`,
              onClick: () =>
                setSelected(selected === s.region ? null : s.region!),
              onKeyDown: (ev: React.KeyboardEvent) => {
                if (ev.key === "Enter" || ev.key === " ") {
                  ev.preventDefault();
                  setSelected(selected === s.region ? null : s.region!);
                }
              },
            }
          : {};
        const common = { className: cls, ...interactive };
        if (s.shape.kind === "rect") {
          const { x, y, w, h, rx } = s.shape;
          return <rect key={s.key} x={x} y={y} width={w} height={h} rx={rx} {...common} />;
        }
        if (s.shape.kind === "circle") {
          const { cx, cy, r } = s.shape;
          return (
            <g key={s.key}>
              <circle cx={cx} cy={cy} r={r} {...common} />
              {tappable && (
                <circle
                  cx={cx}
                  cy={cy}
                  r={16}
                  className="cursor-pointer fill-transparent"
                  onClick={() =>
                    setSelected(selected === s.region ? null : s.region!)
                  }
                />
              )}
            </g>
          );
        }
        const { cx, cy, rx, ry } = s.shape;
        return <ellipse key={s.key} cx={cx} cy={cy} rx={rx} ry={ry} {...common} />;
      })}
    </svg>
  );

  return (
    <figure className="animate-draw-in">
      {/* Flip container: front and back are two faces of one card. */}
      <div className="mx-auto w-44" style={{ perspective: "800px" }}>
        <div
          className="relative transition-transform duration-500 [transform-style:preserve-3d]"
          style={{
            aspectRatio: "220 / 350",
            transform: view === "back" ? "rotateY(180deg)" : undefined,
          }}
        >
          <div className="absolute inset-0 [backface-visibility:hidden]">
            {renderFigure("front")}
          </div>
          <div
            className="absolute inset-0 [backface-visibility:hidden]"
            style={{ transform: "rotateY(180deg)" }}
          >
            {renderFigure("back")}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-center gap-2">
        <Toggle
          options={[
            { value: "front", label: "Front" },
            { value: "back", label: "Back" },
          ]}
          value={view}
          onChange={(v) => {
            setView(v);
            setSelected(null);
          }}
        />
        <Toggle
          options={[
            { value: "man", label: "Man" },
            { value: "woman", label: "Woman" },
          ]}
          value={sex}
          onChange={pickSex}
        />
      </div>

      <figcaption className="mx-auto mt-3 min-h-10 max-w-xs text-center text-sm text-ink/60">
        {selected ? explainRegion(selected, states[selected] ?? "clear") : summary}
      </figcaption>

      <div className="flex items-center justify-center gap-4 text-[11px] text-ink/50">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-moss/75" /> clear
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-ochre/75" /> easing
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-mist" /> resting
        </span>
      </div>
    </figure>
  );
}

function Toggle<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex rounded-full border border-mist bg-paper p-0.5" role="group">
      {options.map((o) => (
        <button
          key={o.value}
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-full px-3.5 py-1.5 text-xs transition-colors ${
            value === o.value ? "bg-moss text-paper" : "text-ink/60"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
