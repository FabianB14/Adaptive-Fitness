import { ShareSheetAnimation } from "../components/ShareSheetAnimation";

/**
 * Install onboarding for iOS Safari. Installing first matters because web
 * push only exists after Add to Home Screen — but the person always keeps
 * the option to continue in the browser. An invitation, not a wall.
 */
export function InstallGate({ onContinue }: { onContinue: () => void }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-8 px-6 py-12">
      <div className="animate-rise text-center">
        <h1 className="font-display text-3xl font-semibold">
          Put this on your home screen
        </h1>
        <p className="mt-3 text-ink/70">
          It works like a regular app — opens full screen, loads instantly, no
          App Store needed.
        </p>
      </div>

      <div className="animate-rise [animation-delay:120ms]">
        <ShareSheetAnimation />
      </div>

      <div className="animate-rise space-y-4 [animation-delay:240ms]">
        <ol className="space-y-2 text-sm text-ink/80">
          <li>
            <strong>1.</strong> Tap the <strong>Share</strong> button below the
            address bar
          </li>
          <li>
            <strong>2.</strong> Scroll down, tap{" "}
            <strong>Add to Home Screen</strong>
          </li>
          <li>
            <strong>3.</strong> Tap <strong>Add</strong>, then open it from
            your home screen
          </li>
        </ol>
        <button
          onClick={onContinue}
          className="w-full rounded-xl border border-mist bg-white px-6 py-3.5 font-medium text-ink transition-transform active:scale-[0.98]"
        >
          Continue in the browser for now
        </button>
      </div>
    </main>
  );
}
