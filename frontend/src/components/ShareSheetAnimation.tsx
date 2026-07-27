/**
 * Animated illustration of the Safari install flow: the Share button pulses,
 * a sheet rises, and "Add to Home Screen" highlights. Pure CSS/SVG, transform
 * and opacity only, loops gently. Static under prefers-reduced-motion (the
 * global reduced-motion rule collapses the animations).
 */
export function ShareSheetAnimation() {
  return (
    <div className="relative mx-auto w-56" aria-hidden="true">
      <style>{`
        @keyframes af-share-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          12% { transform: scale(1.25); opacity: 1; }
          24% { transform: scale(1); }
        }
        @keyframes af-sheet-rise {
          0%, 20% { transform: translateY(105%); }
          38%, 88% { transform: translateY(0); }
          100% { transform: translateY(105%); }
        }
        @keyframes af-row-glow {
          0%, 45% { opacity: 0; }
          58%, 82% { opacity: 1; }
          95%, 100% { opacity: 0; }
        }
        .af-share-btn { animation: af-share-pulse 5s ease-in-out infinite; transform-origin: center; }
        .af-sheet { animation: af-sheet-rise 5s cubic-bezier(0.34, 1.2, 0.5, 1) infinite; }
        .af-row-hl { animation: af-row-glow 5s ease-in-out infinite; }
      `}</style>

      {/* Phone frame */}
      <div className="relative overflow-hidden rounded-[2rem] border-2 border-mist bg-card pb-4 pt-6 shadow-sm">
        {/* Page placeholder lines */}
        <div className="space-y-2 px-5 pb-16">
          <div className="h-2 w-3/4 rounded bg-mist" />
          <div className="h-2 w-full rounded bg-mist" />
          <div className="h-2 w-5/6 rounded bg-mist" />
          <div className="h-2 w-2/3 rounded bg-mist" />
        </div>

        {/* Safari toolbar with the Share button */}
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-8 border-t border-mist bg-paper px-4 py-2.5">
          <div className="h-4 w-4 rounded-sm bg-mist" />
          <svg
            className="af-share-btn h-6 w-6 text-moss"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* iOS share glyph: square with arrow up */}
            <path d="M8 9H7a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1" />
            <path d="M12 14V3" />
            <path d="M8.5 6.5 12 3l3.5 3.5" />
          </svg>
          <div className="h-4 w-4 rounded-sm bg-mist" />
        </div>

        {/* Rising share sheet */}
        <div className="af-sheet absolute inset-x-1.5 bottom-1.5 rounded-t-2xl border border-mist bg-card p-3 shadow-lg">
          <div className="mx-auto mb-3 h-1 w-8 rounded-full bg-mist" />
          <div className="space-y-2">
            <div className="flex items-center gap-2 rounded-lg px-2 py-1.5">
              <div className="h-5 w-5 rounded bg-mist" />
              <div className="h-2 w-20 rounded bg-mist" />
            </div>
            <div className="relative flex items-center gap-2 rounded-lg px-2 py-1.5">
              <div className="af-row-hl absolute inset-0 rounded-lg bg-moss/15 ring-1 ring-moss" />
              <svg
                className="relative h-5 w-5 text-ink"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <rect x="4" y="4" width="16" height="16" rx="3" />
                <path d="M12 8.5v7M8.5 12h7" strokeLinecap="round" />
              </svg>
              <span className="font-body relative text-[11px] font-medium">
                Add to Home Screen
              </span>
            </div>
            <div className="flex items-center gap-2 rounded-lg px-2 py-1.5">
              <div className="h-5 w-5 rounded bg-mist" />
              <div className="h-2 w-16 rounded bg-mist" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
