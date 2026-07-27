import { useEffect, useRef, useState } from "react";
import { buildCardData, drawCard, type ShareInputs } from "../lib/share";

/**
 * Share-card section: live canvas preview + share/save. Uses the native
 * share sheet when the browser can share files (iOS Safari can), otherwise
 * falls back to a PNG download. The card never contains body numbers —
 * see lib/share.ts.
 */
export function ShareCard({ inputs }: { inputs: ShareInputs }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [note, setNote] = useState<string | null>(null);

  const dateLabel = new Date().toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const render = () => drawCard(canvas, buildCardData(inputs, dateLabel));
    render();
    // Redraw once webfonts arrive so the card doesn't keep fallback type.
    document.fonts?.ready?.then(render).catch(() => {});
  }, [inputs, dateLabel]);

  async function toBlob(): Promise<Blob | null> {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  }

  async function share() {
    const blob = await toBlob();
    if (!blob) return;
    const file = new File([blob], "adaptive-fitness.png", { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file] });
        return;
      } catch {
        // Cancelled or unavailable — fall through to download.
      }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "adaptive-fitness.png";
    a.click();
    URL.revokeObjectURL(url);
    setNote("Saved as an image — share it anywhere.");
  }

  return (
    <section className="animate-rise rounded-3xl border border-mist bg-card p-5 shadow-sm [animation-delay:400ms]">
      <h2 className="font-display text-base font-semibold">Share card</h2>
      <p className="mt-1 text-xs text-ink/50">
        Streaks, sessions, stickers — never weight, never measurements.
        Nothing about your body leaves this phone unless you type it yourself.
      </p>

      <canvas
        ref={canvasRef}
        className="mt-3 w-full rounded-2xl border border-mist"
        aria-label="Preview of your share card"
      />

      <button
        onClick={share}
        className="mt-3 w-full rounded-xl bg-moss px-5 py-3 font-medium text-paper transition-transform active:scale-[0.98]"
      >
        Share
      </button>
      {note && <p className="mt-2 text-center text-xs text-ink/50">{note}</p>}
    </section>
  );
}
