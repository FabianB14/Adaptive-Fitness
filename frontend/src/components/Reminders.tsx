import { useEffect, useState } from "react";
import { detectEnv, getApiBase, setApiBase } from "../lib/env";
import {
  disablePush,
  enablePush,
  fetchTypes,
  isPushSupported,
  loadPushPrefs,
  prefsWithDefaults,
  runDiagnostics,
  savePushPrefs,
  sendHello,
  syncReminders,
  type CheckResult,
  type PushPrefs,
  type ReminderType,
} from "../lib/push";

const HOURS = [6, 7, 8, 9, 10, 11, 12, 13, 15, 17, 18, 19, 20, 21];
const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function hourLabel(h: number): string {
  const twelve = h % 12 === 0 ? 12 : h % 12;
  return `${twelve}:00 ${h < 12 ? "AM" : "PM"}`;
}

/**
 * Reminder settings: one switch per kind of nudge, each with its own hour
 * and its own message pool, plus a self-check that says exactly which link
 * in the chain is broken. Lives on the Limits screen.
 */
export function Reminders() {
  const env = detectEnv();
  const [apiBase, setApiBaseState] = useState<string | undefined>(() => getApiBase());
  const [serverInput, setServerInput] = useState("");
  const [types, setTypes] = useState<ReminderType[]>([]);
  const [prefs, setPrefs] = useState<PushPrefs>(() => loadPushPrefs());
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<{ tone: "good" | "warn"; text: string } | null>(null);
  const [checks, setChecks] = useState<CheckResult[] | null>(null);

  useEffect(() => {
    if (!apiBase) return;
    fetchTypes(apiBase).then((t) => {
      setTypes(t);
      setPrefs((p) => savePushPrefs(prefsWithDefaults(p, t)));
    });
  }, [apiBase]);

  const iosNeedsInstall = env.isIOS && !env.isStandalone;

  async function turnOn() {
    if (!apiBase) return;
    setBusy("enable");
    setNote(null);
    try {
      await enablePush(apiBase, prefs);
      setPrefs(loadPushPrefs());
      await sendHello(apiBase);
      setNote({ tone: "good", text: "You're in! A hello should arrive any second. 👋" });
    } catch (e) {
      setNote({
        tone: "warn",
        text: e instanceof Error ? e.message : "That didn't work.",
      });
      setChecks(await runDiagnostics(apiBase));
    } finally {
      setBusy(null);
    }
  }

  async function turnOff() {
    setBusy("disable");
    await disablePush(apiBase ?? null);
    setPrefs(loadPushPrefs());
    setNote({ tone: "good", text: "Reminders are off. Everything else works exactly the same." });
    setBusy(null);
  }

  async function update(next: PushPrefs, label: string) {
    setPrefs(savePushPrefs(next));
    if (!apiBase || !next.enabled) return;
    setBusy(label);
    try {
      await syncReminders(apiBase, next);
      setNote({ tone: "good", text: "Saved." });
    } catch (e) {
      setNote({
        tone: "warn",
        text: `Saved on this device. ${e instanceof Error ? e.message : ""}`.trim(),
      });
    } finally {
      setBusy(null);
    }
  }

  async function test(kind: string, label: string) {
    if (!apiBase) return;
    setBusy(`test-${kind}`);
    setNote(null);
    try {
      await sendHello(apiBase, kind);
      setNote({ tone: "good", text: `Sent the ${label} nudge 👋` });
    } catch (e) {
      setNote({ tone: "warn", text: e instanceof Error ? e.message : "Couldn't send." });
      setChecks(await runDiagnostics(apiBase));
    } finally {
      setBusy(null);
    }
  }

  async function check() {
    setBusy("check");
    setChecks(await runDiagnostics(apiBase ?? null));
    setBusy(null);
  }

  return (
    <div className="space-y-3 rounded-2xl border border-mist bg-card p-4">
      <p className="text-xs text-ink/50">
        Pick the nudges you want. Each one has its own time and its own pool
        of messages — all cute, all kind, never about what you didn't do.
      </p>

      {!isPushSupported() ? (
        <p className="rounded-xl bg-mist/50 px-3.5 py-3 text-xs text-ink/60">
          This browser can't receive notifications. On iPhone, install the
          app to your Home Screen first (Share → Add to Home Screen).
        </p>
      ) : iosNeedsInstall ? (
        <p className="rounded-xl bg-periwinkle/10 px-3.5 py-3 text-xs text-periwinkle">
          Add the app to your Home Screen first — iPhones only allow
          notifications for installed apps. Share → Add to Home Screen, open
          it from there, then come back here.
        </p>
      ) : !apiBase ? (
        <div className="space-y-2">
          <p className="rounded-xl bg-periwinkle/10 px-3.5 py-3 text-xs text-periwinkle">
            Reminders need your server. Paste its URL once — this device
            remembers it.
          </p>
          <div className="flex gap-2">
            <input
              value={serverInput}
              onChange={(e) => setServerInput(e.target.value)}
              inputMode="url"
              autoCapitalize="none"
              placeholder="https://your-app.onrender.com"
              className="font-data w-full flex-1 rounded-xl border border-mist bg-paper px-3 py-2.5 text-sm outline-none focus:border-moss"
            />
            <button
              onClick={() => {
                const url = serverInput.trim().replace(/\/+$/, "");
                if (!/^https:\/\/.+/.test(url)) {
                  setNote({ tone: "warn", text: "That needs to be a full https:// URL." });
                  return;
                }
                setApiBase(url);
                setApiBaseState(url);
                setNote({ tone: "good", text: "Connected." });
              }}
              disabled={!serverInput.trim()}
              className="rounded-xl bg-moss px-4 py-2.5 text-sm font-medium text-paper disabled:opacity-40"
            >
              Connect
            </button>
          </div>
        </div>
      ) : (
        <>
          <ul className="space-y-2">
            {types.map((t) => {
              const pref = prefs.reminders[t.id] ?? {
                enabled: t.default_on,
                hour: t.default_hour,
              };
              return (
                <li
                  key={t.id}
                  className={`rounded-2xl border p-3 transition-colors ${
                    pref.enabled ? "border-moss/40 bg-moss/5" : "border-mist"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-xl leading-none">{t.emoji}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{t.label}</p>
                      <p className="mt-0.5 text-xs text-ink/50">{t.purpose}</p>
                    </div>
                    <button
                      role="switch"
                      aria-checked={pref.enabled}
                      aria-label={`${t.label} reminder`}
                      disabled={busy !== null}
                      onClick={() =>
                        update(
                          {
                            ...prefs,
                            reminders: {
                              ...prefs.reminders,
                              [t.id]: { ...pref, enabled: !pref.enabled },
                            },
                          },
                          `toggle-${t.id}`,
                        )
                      }
                      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
                        pref.enabled ? "bg-moss" : "bg-mist"
                      }`}
                    >
                      <span
                        className={`absolute top-1 h-5 w-5 rounded-full bg-card shadow transition-[left] ${
                          pref.enabled ? "left-6" : "left-1"
                        }`}
                      />
                    </button>
                  </div>

                  {pref.enabled && (
                    <div className="mt-2.5 flex items-center gap-2 border-t border-mist/70 pt-2.5">
                      <label className="text-xs text-ink/50" htmlFor={`hour-${t.id}`}>
                        {t.weekday !== null ? `${WEEKDAYS[t.weekday]}s at` : "Around"}
                      </label>
                      <select
                        id={`hour-${t.id}`}
                        value={pref.hour}
                        disabled={busy !== null}
                        onChange={(e) =>
                          update(
                            {
                              ...prefs,
                              reminders: {
                                ...prefs.reminders,
                                [t.id]: { ...pref, hour: Number(e.target.value) },
                              },
                            },
                            `hour-${t.id}`,
                          )
                        }
                        className="font-data flex-1 rounded-xl border border-mist bg-paper px-2.5 py-2 text-sm outline-none focus:border-moss"
                      >
                        {HOURS.map((h) => (
                          <option key={h} value={h}>
                            {hourLabel(h)}
                          </option>
                        ))}
                      </select>
                      {prefs.enabled && (
                        <button
                          onClick={() => test(t.id, t.label.toLowerCase())}
                          disabled={busy !== null}
                          className="rounded-xl border border-moss px-3 py-2 text-xs font-medium text-moss disabled:opacity-40"
                        >
                          {busy === `test-${t.id}` ? "…" : "Try it"}
                        </button>
                      )}
                    </div>
                  )}

                  {pref.enabled && (
                    <p className="mt-2 rounded-xl bg-paper px-3 py-2 text-xs text-ink/55">
                      e.g. <span className="font-medium">{t.sample.title}</span> —{" "}
                      {t.sample.body}
                      <span className="mt-0.5 block text-ink/40">
                        {t.message_count} messages in rotation
                      </span>
                    </p>
                  )}
                </li>
              );
            })}
          </ul>

          {prefs.enabled ? (
            <button
              onClick={turnOff}
              disabled={busy !== null}
              className="w-full rounded-xl border border-mist px-4 py-3 text-sm text-ink/60 disabled:opacity-40"
            >
              Turn all reminders off
            </button>
          ) : (
            <button
              onClick={turnOn}
              disabled={busy !== null}
              className="w-full rounded-xl bg-moss px-5 py-3 font-medium text-paper transition-transform active:scale-[0.98] disabled:opacity-40"
            >
              {busy === "enable" ? "Setting up…" : "Turn on cute reminders"}
            </button>
          )}
        </>
      )}

      {note && (
        <p
          className={`rounded-xl px-3.5 py-2.5 text-center text-xs ${
            note.tone === "good" ? "bg-moss/10 text-moss" : "bg-ochre/10 text-ochre"
          }`}
        >
          {note.text}
        </p>
      )}

      <button
        onClick={check}
        disabled={busy !== null}
        className="w-full py-1 text-center text-xs text-ink/45 underline-offset-2 hover:underline disabled:opacity-40"
      >
        {busy === "check" ? "Checking…" : "Notifications not arriving? Run a check"}
      </button>

      {checks && (
        <ul className="space-y-1.5 rounded-2xl bg-paper p-3">
          {checks.map((c) => (
            <li key={c.label} className="flex gap-2 text-xs">
              <span className={c.ok ? "text-moss" : "text-ochre"}>{c.ok ? "✓" : "•"}</span>
              <span className="flex-1">
                <span className="font-medium">{c.label}</span>
                <span className="block text-ink/55">{c.detail}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
