import { useEffect, useRef, useState } from "react";
import { formatDistance, type UnitSystem } from "../lib/units";
import {
  acceptSegment,
  haversineM,
  stepsFromDistance,
  stepsFromMinutes,
} from "../lib/walk";

interface Fix {
  lat: number;
  lon: number;
  t: number; // ms
}

/**
 * In-app walk tracker. GPS measures distance while the screen stays on;
 * without GPS a gentle time-based cadence stands in. On finish the walk
 * lands in the activity store as steps + cardio minutes.
 */
export function WalkTracker({
  units,
  heightCm,
  onFinish,
}: {
  units: UnitSystem;
  heightCm: number | undefined;
  onFinish: (steps: number, cardioMin: number) => void;
}) {
  const [active, setActive] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [distM, setDistM] = useState(0);
  const [gpsOn, setGpsOn] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);

  const watchId = useRef<number | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastFix = useRef<Fix | null>(null);

  function stopHardware() {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    if (watchId.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId.current);
    }
    watchId.current = null;
    lastFix.current = null;
  }

  // Never leave the GPS running if the screen unmounts mid-walk.
  useEffect(() => stopHardware, []);

  function start() {
    setActive(true);
    setSeconds(0);
    setDistM(0);
    setSummary(null);
    setGpsOn(false);
    timer.current = setInterval(() => setSeconds((s) => s + 1), 1000);

    if (navigator.geolocation) {
      watchId.current = navigator.geolocation.watchPosition(
        (pos) => {
          setGpsOn(true);
          const fix: Fix = {
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
            t: pos.timestamp,
          };
          const prev = lastFix.current;
          if (prev) {
            const d = haversineM(prev.lat, prev.lon, fix.lat, fix.lon);
            const dt = (fix.t - prev.t) / 1000;
            if (acceptSegment(d, dt, pos.coords.accuracy ?? 99)) {
              setDistM((m) => m + d);
            }
          }
          lastFix.current = fix;
        },
        () => setGpsOn(false),
        { enableHighAccuracy: true, maximumAge: 2000, timeout: 15000 },
      );
    }
  }

  function finish(discard: boolean) {
    stopHardware();
    setActive(false);
    if (discard) return;

    const minutes = Math.max(seconds >= 30 ? 1 : 0, Math.round(seconds / 60));
    const steps =
      distM > 30 ? stepsFromDistance(distM, heightCm) : stepsFromMinutes(minutes);
    if (steps > 0 || minutes > 0) {
      onFinish(steps, minutes);
      setSummary(
        `Logged ${steps.toLocaleString()} steps and ${minutes} min${
          distM > 30 ? ` (${formatDistance(distM, units)})` : ""
        }. Added to your week.`,
      );
    } else {
      setSummary("Too short to count this time — it's still a start.");
    }
  }

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  const liveSteps =
    distM > 30 ? stepsFromDistance(distM, heightCm) : stepsFromMinutes(seconds / 60);

  return (
    <section className="animate-rise rounded-3xl border border-mist bg-card p-5 shadow-sm [animation-delay:360ms]">
      <h2 className="font-display text-base font-semibold">Track a walk</h2>

      {!active ? (
        <>
          <p className="mt-1 text-xs text-ink/50">
            Keep the app open while you walk — iPhones don't let web apps
            count steps in the background or read the Health app. GPS
            measures the distance; without it, time stands in.
          </p>
          <button
            onClick={start}
            className="mt-3 w-full rounded-xl bg-periwinkle px-5 py-3 font-medium text-paper transition-transform active:scale-[0.98]"
          >
            Start walking
          </button>
          {summary && (
            <p className="mt-2 rounded-2xl bg-moss/10 px-4 py-3 text-center text-sm text-moss">
              {summary}
            </p>
          )}
        </>
      ) : (
        <>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl bg-paper px-2 py-3">
              <p className="font-data text-xl font-medium leading-none">
                {mm}:{ss}
              </p>
              <p className="mt-1 text-[11px] text-ink/45">time</p>
            </div>
            <div className="rounded-2xl bg-paper px-2 py-3">
              <p className="font-data text-xl font-medium leading-none">
                {liveSteps.toLocaleString()}
              </p>
              <p className="mt-1 text-[11px] text-ink/45">est. steps</p>
            </div>
            <div className="rounded-2xl bg-paper px-2 py-3">
              <p className="font-data text-xl font-medium leading-none">
                {gpsOn ? formatDistance(distM, units) : "—"}
              </p>
              <p className="mt-1 text-[11px] text-ink/45">
                {gpsOn ? "distance" : "no GPS"}
              </p>
            </div>
          </div>
          <p className="mt-2 text-center text-xs text-ink/45">
            {gpsOn
              ? "GPS is measuring — screen stays on, phone can go in a pocket facing out."
              : "Estimating from time at an easy pace. Allow location for distance."}
          </p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => finish(true)}
              className="rounded-xl border border-mist px-5 py-3 text-sm text-ink/60"
            >
              Discard
            </button>
            <button
              onClick={() => finish(false)}
              className="flex-1 rounded-xl bg-moss px-5 py-3 font-medium text-paper transition-transform active:scale-[0.98]"
            >
              Finish walk
            </button>
          </div>
        </>
      )}
    </section>
  );
}
