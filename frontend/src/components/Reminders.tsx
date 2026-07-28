import { useEffect, useState } from "react";
import { detectEnv, getApiBase } from "../lib/env";
import {
  disablePush,
  enablePush,
  isPushSupported,
  loadPushPrefs,
  savePushPrefs,
  sendHello,
} from "../lib/push";

const HOURS = [6, 7, 8, 9, 10, 12, 15, 17, 18, 19, 20, 21];

function hourLabel(h: number): string {
  const twelve = h % 12 === 0 ? 12 : h % 12;
  return `${twelve}:00 ${h < 12 ? "AM" : "PM"}`;
}

const SAMPLE = {
  title: "🌱 Tiny plans, big kindness",
  body: "Your Full, Light, and Minimum days are ready. Any of them counts.",
};

/**
 * Daily reminder opt-in — one cute nudge a day, never guilt. Lives on the
 * Limits screen next to Appearance. Push needs the backend (VAPID keys)
 * and, on iPhone, the app installed to the Home Screen.
 */
export function Reminders() {
  const env = detectEnv();
  const apiBase = getApiBase();
  const [prefs, setPrefs] = useState(() => loadPushPrefs());
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [preview, setPreview] = useState(SAMPLE);

  useEffect(() => {
    if (!apiBase) return;
    fetch(`${apiBase}/push/preview`)
      .then((r) => (r.ok ? r.json() : null))
      .then((p) => p && setPreview(p))
      .catch(() => {});
  }, [apiBase]);

  const iosNeedsInstall = env.isIOS && !env.isStandalone;

  async function turnOn(hour: number) {
    if (!apiBase) return;
    setBusy(true);
    setNote(null);
    try {
      await enablePush(apiBase, hour);
      setPrefs(loadPushPrefs());
      await sendHello(apiBase).catch(() => {});
      setNote("You're in! A hello should arrive any second. 👋");
    } catch (e) {
      setNote(e instanceof Error ? e.message : "That didn't work — try again later.");
    } finally {
      setBusy(false);
    }
  }

  async function changeHour(hour: number) {
    setPrefs(savePushPrefs({ ...prefs, hour }));
    if (apiBase && prefs.enabled) {
      setBusy(true);
      try {
        await enablePush(apiBase, hour);
        setNote(`Moved to ${hourLabel(hour)}.`);
      } catch {
        setNote("Saved here — the server will catch up next time it's reachable.");
      } finally {
        setBusy(false);
      }
    }
  }

  async function turnOff() {
    setBusy(true);
    await disablePush(apiBase ?? null);
    setPrefs(loadPushPrefs());
    setNote("Reminders are off. Everything else works exactly the same.");
    setBusy(false);
  }

  return (
    <div className="rounded-2xl border border-mist bg-card p-4">
      {/* What a nudge looks like */}
      <div className="rounded-xl bg-paper px-3.5 py-3">
        <p className="text-sm font-medium">{preview.title}</p>
        <p className="mt-0.5 text-xs text-ink/60">{preview.body}</p>
      </div>
      <p className="mt-2 pl-1 text-xs text-ink/50">
        One nudge a day, in this spirit — cute, kind, and never about what
        you didn't do.
      </p>

      {!isPushSupported() ? (
        <p className="mt-3 rounded-xl bg-mist/50 px-3.5 py-3 text-xs text-ink/60">
          This browser can't receive notifications. On iPhone, install the
          app to your Home Screen first (Share → Add to Home Screen).
        </p>
      ) : iosNeedsInstall ? (
        <p className="mt-3 rounded-xl bg-periwinkle/10 px-3.5 py-3 text-xs text-periwinkle">
          Add the app to your Home Screen first — iPhones only allow
          notifications for installed apps. Share → Add to Home Screen,
          then come back here.
        </p>
      ) : !apiBase ? (
        <a
          href="#/upload"
          className="mt-3 block rounded-xl bg-periwinkle/10 px-3.5 py-3 text-xs text-periwinkle"
        >
          Reminders need your server — connect it once on the Upload screen
          and come back. →
        </a>
      ) : (
        <>
          <div className="mt-3 flex items-center gap-2">
            <label className="text-xs text-ink/50" htmlFor="reminder-hour">
              Around
            </label>
            <select
              id="reminder-hour"
              value={prefs.hour}
              disabled={busy}
              onChange={(e) => changeHour(Number(e.target.value))}
              className="font-data flex-1 rounded-xl border border-mist bg-paper px-3 py-2.5 text-sm outline-none focus:border-moss"
            >
              {HOURS.map((h) => (
                <option key={h} value={h}>
                  {hourLabel(h)}
                </option>
              ))}
            </select>
          </div>

          {prefs.enabled ? (
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => sendHello(apiBase).then(
                  () => setNote("Hello sent 👋"),
                  () => setNote("Couldn't send just now — the reminder itself is unaffected."),
                )}
                disabled={busy}
                className="flex-1 rounded-xl border border-moss px-4 py-3 text-sm font-medium text-moss disabled:opacity-40"
              >
                Send a hello 👋
              </button>
              <button
                onClick={turnOff}
                disabled={busy}
                className="rounded-xl border border-mist px-4 py-3 text-sm text-ink/60 disabled:opacity-40"
              >
                Turn off
              </button>
            </div>
          ) : (
            <button
              onClick={() => turnOn(prefs.hour)}
              disabled={busy}
              className="mt-3 w-full rounded-xl bg-moss px-5 py-3 font-medium text-paper transition-transform active:scale-[0.98] disabled:opacity-40"
            >
              {busy ? "Setting up…" : "Turn on cute reminders"}
            </button>
          )}
        </>
      )}

      {note && (
        <p className="mt-2 rounded-xl bg-moss/10 px-3.5 py-2.5 text-center text-xs text-moss">
          {note}
        </p>
      )}
    </div>
  );
}
