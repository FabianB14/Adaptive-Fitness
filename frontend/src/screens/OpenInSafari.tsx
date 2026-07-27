/**
 * Shown when the app is opened inside an in-app browser (Instagram, Messenger,
 * TikTok…). Add to Home Screen only exists in Safari, so this screen has one
 * job: get the person into Safari with zero ambiguity and zero blame.
 */
export function OpenInSafari() {
  const url = window.location.href;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Clipboard can be unavailable in in-app webviews; the URL is shown
      // on screen either way.
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-8 px-6 py-12">
      <div className="animate-rise">
        <h1 className="font-display text-3xl font-semibold">
          One quick step: open this in Safari
        </h1>
        <p className="mt-3 text-ink/70">
          You're viewing this inside another app's browser, which can't install
          web apps. Safari can.
        </p>
      </div>

      <ol className="animate-rise space-y-4 [animation-delay:120ms]">
        <li className="flex items-start gap-3">
          <span className="font-data mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-moss text-sm text-paper">
            1
          </span>
          <p>
            Tap the <strong>⋯</strong> or <strong>share</strong> button in this
            app's browser bar.
          </p>
        </li>
        <li className="flex items-start gap-3">
          <span className="font-data mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-moss text-sm text-paper">
            2
          </span>
          <p>
            Choose <strong>Open in Safari</strong> (or{" "}
            <strong>Open in browser</strong>).
          </p>
        </li>
        <li className="flex items-start gap-3">
          <span className="font-data mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-moss text-sm text-paper">
            3
          </span>
          <p>Pick up right here — nothing is lost.</p>
        </li>
      </ol>

      <div className="animate-rise space-y-3 [animation-delay:240ms]">
        <button
          onClick={copyLink}
          className="w-full rounded-xl bg-moss px-6 py-3.5 font-medium text-paper transition-transform active:scale-[0.98]"
        >
          Copy link for Safari
        </button>
        <p className="font-data break-all text-center text-xs text-ink/50">
          {url}
        </p>
      </div>
    </main>
  );
}
