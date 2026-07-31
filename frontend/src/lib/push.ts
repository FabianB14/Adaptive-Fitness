/**
 * Web Push client. Several kinds of gentle nudge, each with its own hour,
 * opt-in per kind. iOS reality: notifications only work once the app is
 * installed to the Home Screen (16.4+), and permission must be asked from
 * a tap.
 *
 * Everything here reports *why* it failed. Silent "that didn't work" is
 * the one thing a reminder feature can't afford.
 */

const PUSH_KEY = "af.push.v2";

export interface ReminderPref {
  enabled: boolean;
  hour: number;
}

export interface PushPrefs {
  /** True once the device has completed a subscription. */
  enabled: boolean;
  /** kind id → {enabled, hour} */
  reminders: Record<string, ReminderPref>;
}

export interface ReminderType {
  id: string;
  label: string;
  emoji: string;
  purpose: string;
  default_hour: number;
  default_on: boolean;
  weekday: number | null;
  sample: { title: string; body: string };
  message_count: number;
}

const FALLBACK_TYPES: ReminderType[] = [
  {
    id: "daily_plan",
    label: "Today's plan",
    emoji: "🌱",
    purpose: "A morning hello with your three days ready to pick from.",
    default_hour: 9,
    default_on: true,
    weekday: null,
    sample: {
      title: "🌱 Tiny plans, big kindness",
      body: "Your Full, Light, and Minimum days are ready. Any of them counts.",
    },
    message_count: 7,
  },
];

export function loadPushPrefs(): PushPrefs {
  try {
    const raw = localStorage.getItem(PUSH_KEY);
    if (raw) return { enabled: false, reminders: {}, ...JSON.parse(raw) };
  } catch {
    // fall through
  }
  return { enabled: false, reminders: {} };
}

export function savePushPrefs(p: PushPrefs): PushPrefs {
  try {
    localStorage.setItem(PUSH_KEY, JSON.stringify(p));
  } catch {
    // Preference just won't survive the session.
  }
  return p;
}

/** Prefs seeded from the server's defaults for any kind not chosen yet. */
export function prefsWithDefaults(
  prefs: PushPrefs,
  types: ReminderType[],
): PushPrefs {
  const reminders = { ...prefs.reminders };
  for (const t of types) {
    if (!reminders[t.id]) {
      reminders[t.id] = { enabled: t.default_on, hour: t.default_hour };
    }
  }
  return { ...prefs, reminders };
}

/** The {kind: hour} map the server wants — enabled kinds only. */
export function activeReminders(prefs: PushPrefs): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [id, r] of Object.entries(prefs.reminders)) {
    if (r.enabled) out[id] = r.hour;
  }
  return out;
}

export function isPushSupported(): boolean {
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/** VAPID public key (base64url) → the byte array PushManager wants. */
export function urlBase64ToUint8Array(base64url: string): Uint8Array {
  const padding = "=".repeat((4 - (base64url.length % 4)) % 4);
  const base64 = (base64url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/** Bytes of a subscription's server key, for comparing against the current
    one. A mismatch means the server rotated keys and this subscription can
    never receive anything again. */
function subscriptionKeyMatches(sub: PushSubscription, publicKey: string): boolean {
  const existing = sub.options?.applicationServerKey;
  if (!existing) return true; // nothing to compare — assume fine
  const current = urlBase64ToUint8Array(publicKey);
  const bytes = new Uint8Array(existing as ArrayBuffer);
  if (bytes.length !== current.length) return false;
  return bytes.every((b, i) => b === current[i]);
}

export function localUtcOffsetMinutes(): number {
  return -new Date().getTimezoneOffset();
}

/** fetch with a timeout — a sleeping free-tier server otherwise hangs the
    UI with no explanation. */
async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  ms = 20_000,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export interface ServerConfig {
  configured: boolean;
  public_key: string | null;
  healthy: boolean;
  problems: string[];
}

/** Wakes a sleeping server if needed (free instances cold-start slowly). */
export async function fetchConfig(apiBase: string): Promise<ServerConfig> {
  let last: unknown = null;
  for (const timeout of [20_000, 45_000]) {
    try {
      const r = await fetchWithTimeout(`${apiBase}/push/config`, {}, timeout);
      if (!r.ok) throw new Error(`Server replied ${r.status}.`);
      return (await r.json()) as ServerConfig;
    } catch (e) {
      last = e;
    }
  }
  throw new Error(
    last instanceof Error && last.name === "AbortError"
      ? "The server didn't answer in time. Free servers sleep when idle — open its /health page once, then try again."
      : `Couldn't reach the server. ${last instanceof Error ? last.message : ""}`.trim(),
  );
}

export async function fetchTypes(apiBase: string): Promise<ReminderType[]> {
  try {
    const r = await fetchWithTimeout(`${apiBase}/push/types`, {}, 20_000);
    if (!r.ok) throw new Error();
    const body = (await r.json()) as { types: ReminderType[] };
    return body.types?.length ? body.types : FALLBACK_TYPES;
  } catch {
    return FALLBACK_TYPES;
  }
}

async function readError(r: Response, fallback: string): Promise<string> {
  try {
    const body = await r.json();
    if (typeof body?.detail === "string") return body.detail;
  } catch {
    // not JSON
  }
  return `${fallback} (HTTP ${r.status})`;
}

async function registerWithServer(
  apiBase: string,
  sub: PushSubscription,
  prefs: PushPrefs,
): Promise<void> {
  const r = await fetchWithTimeout(`${apiBase}/push/subscribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      subscription: sub.toJSON(),
      reminders: activeReminders(prefs),
      offset_minutes: localUtcOffsetMinutes(),
    }),
  });
  if (!r.ok) throw new Error(await readError(r, "The server didn't accept the subscription."));
}

/** Get a subscription that matches the server's current key, replacing a
    stale one if the keys were rotated. */
async function ensureSubscription(publicKey: string): Promise<PushSubscription> {
  const reg = await navigator.serviceWorker.ready;
  const existing = await reg.pushManager.getSubscription();
  if (existing) {
    if (subscriptionKeyMatches(existing, publicKey)) return existing;
    // Server keys changed — this subscription is permanently undeliverable.
    await existing.unsubscribe().catch(() => {});
  }
  try {
    return await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey).buffer as ArrayBuffer,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`The browser refused to create a subscription. ${msg}`);
  }
}

/** Full opt-in flow. Must be called from a user gesture (iOS requires it). */
export async function enablePush(apiBase: string, prefs: PushPrefs): Promise<void> {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error(
      permission === "denied"
        ? "Notifications are blocked for this app in your browser's settings. That's okay — nothing else changes."
        : "Permission wasn't granted. Nothing changes without it.",
    );
  }
  const cfg = await fetchConfig(apiBase);
  if (!cfg.configured || !cfg.public_key) {
    throw new Error(
      "The server has no VAPID keys yet — set AF_VAPID_PUBLIC_KEY and AF_VAPID_PRIVATE_KEY, then redeploy.",
    );
  }
  if (!cfg.healthy && cfg.problems.length > 0) {
    throw new Error(cfg.problems[0]);
  }
  const sub = await ensureSubscription(cfg.public_key);
  await registerWithServer(apiBase, sub, prefs);
  savePushPrefs({ ...prefs, enabled: true });
}

/** Ask the server to send one notification right now. `kind` picks which
    reminder's message to hear. */
export async function sendHello(apiBase: string, kind?: string): Promise<void> {
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) throw new Error("This device isn't subscribed yet.");
  const r = await fetchWithTimeout(`${apiBase}/push/hello`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint: sub.endpoint, kind }),
  });
  if (!r.ok) throw new Error(await readError(r, "The push service didn't accept it."));
}

export async function disablePush(apiBase: string | null): Promise<void> {
  const prefs = loadPushPrefs();
  savePushPrefs({ ...prefs, enabled: false });
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      if (apiBase) {
        await fetch(`${apiBase}/push/unsubscribe`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        }).catch(() => {});
      }
      await sub.unsubscribe();
    }
  } catch {
    // Local preference is already off; server prunes dead endpoints itself.
  }
}

/** Push new hours/switches to the server without re-asking permission. */
export async function syncReminders(apiBase: string, prefs: PushPrefs): Promise<void> {
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) throw new Error("This device isn't subscribed yet.");
  await registerWithServer(apiBase, sub, prefs);
}

/** Called on every app launch: quietly refresh the server's copy of the
    subscription so an ephemeral server store heals itself. */
export async function resubscribeIfEnabled(apiBase: string | null): Promise<void> {
  const prefs = loadPushPrefs();
  if (!prefs.enabled || !apiBase || !isPushSupported()) return;
  if (Notification.permission !== "granted") return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) await registerWithServer(apiBase, sub, prefs);
  } catch {
    // Next launch will try again.
  }
}

// -------------------------------------------------------------- diagnostics

export interface CheckResult {
  label: string;
  ok: boolean;
  detail: string;
}

/**
 * Walks the whole chain and reports each link. This is what turns "can't
 * do that right now" into a sentence someone can act on.
 */
export async function runDiagnostics(apiBase: string | null): Promise<CheckResult[]> {
  const out: CheckResult[] = [];
  const add = (label: string, ok: boolean, detail: string) =>
    out.push({ label, ok, detail });

  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as { standalone?: boolean }).standalone === true;
  const isIOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  add(
    "Installed to Home Screen",
    standalone || !isIOS,
    standalone
      ? "Running as an installed app."
      : isIOS
        ? "iPhones only allow notifications for installed apps. Share → Add to Home Screen, open it from there, then re-run this."
        : "Not required on this browser.",
  );

  add(
    "Browser support",
    isPushSupported(),
    isPushSupported()
      ? "Service workers and the Push API are available."
      : "This browser doesn't expose the Push API.",
  );

  add(
    "Permission",
    Notification.permission === "granted",
    Notification.permission === "granted"
      ? "Granted."
      : Notification.permission === "denied"
        ? "Blocked. Re-allow notifications for this site in your browser or iOS Settings → Notifications."
        : "Not asked yet — turn a reminder on.",
  );

  let reg: ServiceWorkerRegistration | null = null;
  try {
    reg = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<never>((_, rej) =>
        setTimeout(() => rej(new Error("timed out")), 8000),
      ),
    ]);
    add("Service worker", true, "Active and ready.");
  } catch (e) {
    add(
      "Service worker",
      false,
      `Not ready (${e instanceof Error ? e.message : "unknown"}). Close and reopen the app.`,
    );
  }

  if (!apiBase) {
    add("Server", false, "No server connected on this device.");
    return out;
  }

  let cfg: ServerConfig | null = null;
  try {
    cfg = await fetchConfig(apiBase);
    add("Server reachable", true, `${apiBase} answered.`);
  } catch (e) {
    add("Server reachable", false, e instanceof Error ? e.message : "No answer.");
    return out;
  }

  add(
    "Server push keys",
    cfg.configured && cfg.healthy,
    cfg.problems.length > 0
      ? cfg.problems.join(" ")
      : cfg.configured
        ? "VAPID keys present and readable."
        : "No VAPID keys set on the server.",
  );

  const sub = reg ? await reg.pushManager.getSubscription() : null;
  if (!sub) {
    add("This device's subscription", false, "Not subscribed yet — turn a reminder on.");
    return out;
  }
  const matches = cfg.public_key ? subscriptionKeyMatches(sub, cfg.public_key) : true;
  add(
    "This device's subscription",
    matches,
    matches
      ? `Registered with ${new URL(sub.endpoint).host}.`
      : "Was created with the server's OLD keys and can never receive anything. Turn reminders off and on again to fix it.",
  );

  try {
    const r = await fetchWithTimeout(
      `${apiBase}/push/status?endpoint=${encodeURIComponent(sub.endpoint)}`,
    );
    const body = (await r.json()) as { known: boolean; reminders: Record<string, unknown> };
    add(
      "Known to the server",
      body.known,
      body.known
        ? `${Object.keys(body.reminders).length} reminder(s) scheduled.`
        : "The server has no record of this device. Turn reminders off and on again.",
    );
  } catch {
    add("Known to the server", false, "Couldn't check.");
  }

  return out;
}
