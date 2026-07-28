/**
 * Chrome/Edge/Android install prompt plumbing. The browser fires
 * `beforeinstallprompt` early (often before React mounts), so this module
 * is imported from main.tsx and captures the event at import time. iOS
 * has no such event — the InstallGate handles Safari's manual flow.
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISSED_KEY = "af.installPrompt.dismissed";

let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

function notify() {
  for (const l of listeners) l();
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); // we show our own calm card instead of the mini-bar
    deferred = e as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    notify();
  });
}

export function installDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

export function dismissInstall(): void {
  try {
    localStorage.setItem(DISMISSED_KEY, "1");
  } catch {
    // Shown again next session — harmless.
  }
  notify();
}

/** True when the browser has offered installability and the user hasn't
    said "not now". */
export function canPromptInstall(): boolean {
  return deferred !== null && !installDismissed();
}

/** Show the browser's install dialog. Resolves true if accepted. Must be
    called from a user gesture. */
export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  const event = deferred;
  deferred = null; // Chrome only allows one prompt() per captured event
  notify();
  await event.prompt();
  const choice = await event.userChoice;
  if (choice.outcome !== "accepted") {
    dismissInstall(); // asked and answered — don't nag this device again
  }
  return choice.outcome === "accepted";
}

/** Subscribe to installability changes; returns an unsubscribe. */
export function onInstallChange(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
