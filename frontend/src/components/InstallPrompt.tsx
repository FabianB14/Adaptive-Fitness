import { useEffect, useState } from "react";
import {
  canPromptInstall,
  dismissInstall,
  onInstallChange,
  promptInstall,
} from "../lib/install";

/**
 * The Chrome/Edge/Android install card — shown once the browser signals
 * installability, dismissible forever with one tap. iOS never fires the
 * event, so this renders nothing there (InstallGate covers Safari).
 */
export function InstallPrompt() {
  const [visible, setVisible] = useState(() => canPromptInstall());

  useEffect(() => onInstallChange(() => setVisible(canPromptInstall())), []);

  if (!visible) return null;

  return (
    <section className="animate-rise flex items-center gap-3 rounded-3xl border border-mist bg-card p-4 shadow-sm">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-moss/10 text-xl">
        🌱
      </span>
      <span className="flex-1">
        <span className="block text-sm font-medium">Install the app</span>
        <span className="block text-xs text-ink/50">
          Home-screen icon, full screen, works offline — and notifications
          can reach you.
        </span>
      </span>
      <span className="flex shrink-0 flex-col items-stretch gap-1">
        <button
          onClick={() => promptInstall().catch(() => {})}
          className="rounded-full bg-moss px-4 py-2 text-sm font-medium text-paper transition-transform active:scale-[0.97]"
        >
          Install
        </button>
        <button
          onClick={dismissInstall}
          className="py-0.5 text-center text-xs text-ink/45 underline-offset-2 hover:underline"
        >
          not now
        </button>
      </span>
    </section>
  );
}
