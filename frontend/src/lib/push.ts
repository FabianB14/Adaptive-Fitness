/**
 * Web Push client. One cute nudge a day, opt-in, at an hour the user
 * picks. iOS reality: notifications only work once the app is installed
 * to the Home Screen (16.4+), and permission must be asked from a tap.
 *
 * The stored flag re-registers the subscription with the server on every
 * launch, so an ephemeral server store heals itself.
 */

const PUSH_KEY = "af.push.v1";

export interface PushPrefs {
  enabled: boolean;
  hour: number; // local hour 0–23
}

export function loadPushPrefs(): PushPrefs {
  try {
    const raw = localStorage.getItem(PUSH_KEY);
    if (raw) return { enabled: false, hour: 9, ...JSON.parse(raw) };
  } catch {
    // fall through
  }
  return { enabled: false, hour: 9 };
}

export function savePushPrefs(p: PushPrefs): PushPrefs {
  try {
    localStorage.setItem(PUSH_KEY, JSON.stringify(p));
  } catch {
    // Preference just won't survive the session.
  }
  return p;
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

/** Local − UTC in minutes, the convention the backend expects. */
export function localUtcOffsetMinutes(): number {
  return -new Date().getTimezoneOffset();
}

async function serverPublicKey(apiBase: string): Promise<string> {
  const r = await fetch(`${apiBase}/push/config`);
  if (!r.ok) throw new Error("Couldn't reach the server.");
  const cfg = (await r.json()) as { configured: boolean; public_key: string | null };
  if (!cfg.configured || !cfg.public_key) {
    throw new Error("The server doesn't have push set up yet (VAPID keys).");
  }
  return cfg.public_key;
}

async function registerWithServer(
  apiBase: string,
  sub: PushSubscription,
  hour: number,
): Promise<void> {
  const r = await fetch(`${apiBase}/push/subscribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      subscription: sub.toJSON(),
      hour,
      offset_minutes: localUtcOffsetMinutes(),
    }),
  });
  if (!r.ok) throw new Error("The server didn't accept the subscription.");
}

/** Full opt-in flow. Must be called from a user gesture (iOS requires it). */
export async function enablePush(apiBase: string, hour: number): Promise<void> {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error(
      "Notifications are blocked for this app. That's okay — nothing changes without them.",
    );
  }
  const key = await serverPublicKey(apiBase);
  const reg = await navigator.serviceWorker.ready;
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(key).buffer as ArrayBuffer,
    }));
  await registerWithServer(apiBase, sub, hour);
  savePushPrefs({ enabled: true, hour });
}

/** Ask the server to send the welcome notification right now. */
export async function sendHello(apiBase: string): Promise<void> {
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) throw new Error("Not subscribed yet.");
  const r = await fetch(`${apiBase}/push/hello`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint: sub.endpoint }),
  });
  if (!r.ok) throw new Error("The push service didn't accept it.");
}

export async function disablePush(apiBase: string | null): Promise<void> {
  savePushPrefs({ ...loadPushPrefs(), enabled: false });
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

/** Called on every app launch: quietly refresh the server's copy of the
    subscription so an ephemeral server store heals itself. */
export async function resubscribeIfEnabled(apiBase: string | null): Promise<void> {
  const prefs = loadPushPrefs();
  if (!prefs.enabled || !apiBase || !isPushSupported()) return;
  if (Notification.permission !== "granted") return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) await registerWithServer(apiBase, sub, prefs.hour);
  } catch {
    // Next launch will try again.
  }
}
