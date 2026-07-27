import { useRef, useState } from "react";
import { loadConstraints, PATTERN_AVOID_LABELS, REGION_LABELS, saveConstraints } from "../lib/constraints";
import { getApiBase, setApiBase } from "../lib/env";
import { applyExtraction, type ExtractionResult } from "../lib/extraction";

type Phase = "pick" | "reading" | "review" | "done";

/**
 * Medical document upload. The document is read once, in memory, on the
 * server — never stored. What comes back is shown in plain language, every
 * item individually toggleable, before anything touches the plan. This
 * screen is the trust moment of the product.
 */
export function Upload() {
  const [apiBase, setApiBaseState] = useState<string | undefined>(() => getApiBase());
  const [urlDraft, setUrlDraft] = useState("");
  const [phase, setPhase] = useState<Phase>("pick");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [accepted, setAccepted] = useState<Record<string, boolean>>({});
  const fileInput = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setError(null);
    setPhase("reading");
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`${apiBase}/extract`, { method: "POST", body: form });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(
          body?.detail ??
            "The reader had a problem with that file. Try again, or enter your limits manually.",
        );
      }
      const data = (await res.json()) as ExtractionResult;
      setResult(data);
      // Everything starts accepted; the user unchecks what we got wrong.
      const initial: Record<string, boolean> = {};
      data.regions.forEach((_, i) => (initial[`r${i}`] = true));
      data.contraindicated_patterns.forEach((p) => (initial[`p:${p}`] = true));
      data.rom_limits.forEach((_, i) => (initial[`m${i}`] = true));
      initial["impact"] = true;
      setAccepted(initial);
      setPhase("review");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong reading the file.");
      setPhase("pick");
    }
  }

  function confirm() {
    if (!result) return;
    const merged = applyExtraction(loadConstraints(), {
      regions: result.regions.filter((_, i) => accepted[`r${i}`]),
      patterns: result.contraindicated_patterns.filter((p) => accepted[`p:${p}`]),
      romLimits: result.rom_limits.filter((_, i) => accepted[`m${i}`]),
      impactCeiling: accepted["impact"] ? result.cardio_impact_ceiling : null,
    });
    saveConstraints(merged);
    setPhase("done");
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 px-5 pb-28 pt-8">
      <header className="animate-rise">
        <p className="text-xs font-medium uppercase tracking-wide text-ink/40">
          Medical paperwork
        </p>
        <h1 className="font-display mt-0.5 text-[1.75rem] font-semibold leading-tight">
          {phase === "review" ? "Here's what we read" : "Upload a document"}
        </h1>
      </header>

      {!apiBase ? (
        <section className="animate-rise space-y-3 rounded-3xl border border-mist bg-card p-5 shadow-sm [animation-delay:80ms]">
          <p className="text-sm text-ink/70">
            Document reading runs on your server (so the AI key never lives in
            the browser). Paste your server's URL once to connect it — for
            example your Render address.
          </p>
          <input
            value={urlDraft}
            onChange={(e) => setUrlDraft(e.target.value)}
            placeholder="https://your-app.onrender.com"
            inputMode="url"
            autoCapitalize="none"
            className="font-data w-full rounded-xl border border-mist bg-paper px-3 py-3 text-sm outline-none focus:border-moss"
            aria-label="Server URL"
          />
          <button
            disabled={!urlDraft.trim().startsWith("http")}
            onClick={() => {
              setApiBase(urlDraft);
              setApiBaseState(getApiBase());
            }}
            className="w-full rounded-xl bg-moss px-5 py-3 font-medium text-paper disabled:opacity-40"
          >
            Connect server
          </button>
          <p className="text-xs text-ink/50">
            No server yet? You can still set every limit by hand in the Limits
            tab — the plan works exactly the same way.
          </p>
        </section>
      ) : phase === "pick" ? (
        <section className="animate-rise space-y-4 [animation-delay:80ms]">
          <div className="rounded-3xl border border-mist bg-card p-5 shadow-sm">
            <p className="text-sm text-ink/70">
              VA rating letter, physical therapy notes, discharge paperwork,
              an imaging report — a PDF or a photo of the page.
            </p>
            <ul className="mt-3 space-y-1.5 text-xs text-ink/55">
              <li>• Your document is read once and discarded — never stored.</li>
              <li>• You review and approve everything before it touches your plan.</li>
              <li>• We extract stated limitations only. This is not medical advice.</li>
            </ul>
            <input
              ref={fileInput}
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
            <button
              onClick={() => fileInput.current?.click()}
              className="mt-4 w-full rounded-xl bg-moss px-5 py-3.5 font-medium text-paper transition-transform active:scale-[0.98]"
            >
              Choose a file
            </button>
          </div>
          {error && (
            <p className="rounded-2xl bg-ochre/10 px-4 py-3 text-sm text-ochre">{error}</p>
          )}
          <button
            onClick={() => {
              setApiBase("");
              setApiBaseState(undefined);
            }}
            className="w-full text-center text-xs text-ink/45 underline-offset-2 hover:underline"
          >
            Server: <span className="font-data">{apiBase}</span> — change
          </button>
        </section>
      ) : phase === "reading" ? (
        <section className="animate-rise rounded-3xl border border-mist bg-card p-8 text-center shadow-sm [animation-delay:80ms]">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-[3px] border-mist border-t-moss" />
          <p className="font-display mt-4 font-semibold">Reading your document</p>
          <p className="mt-1 text-sm text-ink/60">
            Usually under a minute. Nothing is saved along the way.
          </p>
        </section>
      ) : phase === "review" && result ? (
        <section className="space-y-4">
          <p className="animate-rise text-sm text-ink/70">
            Each item is a switch — turn off anything we got wrong. Nothing
            applies until you confirm.
          </p>

          {result.regions.length > 0 && (
            <div className="animate-rise space-y-2 [animation-delay:60ms]">
              <h2 className="font-display px-1 text-base font-semibold">Body regions</h2>
              {result.regions.map((r, i) => (
                <ToggleCard
                  key={`r${i}`}
                  on={!!accepted[`r${i}`]}
                  onToggle={() => setAccepted({ ...accepted, [`r${i}`]: !accepted[`r${i}`] })}
                  title={`${r.side ? r.side + " " : ""}${(REGION_LABELS[r.region] ?? r.region).toLowerCase()} — ${
                    r.suggested_state === "suppressed" ? "rest it" : "go easy on it"
                  }`}
                  sub={`We read this as: ${r.severity} finding (${r.source}). Is that right?`}
                  flag={r.low_confidence ? "we weren't sure here, so we kept it strict" : undefined}
                />
              ))}
            </div>
          )}

          {result.contraindicated_patterns.length > 0 && (
            <div className="animate-rise space-y-2 [animation-delay:120ms]">
              <h2 className="font-display px-1 text-base font-semibold">Movements to avoid</h2>
              {result.contraindicated_patterns.map((p) => (
                <ToggleCard
                  key={p}
                  on={!!accepted[`p:${p}`]}
                  onToggle={() => setAccepted({ ...accepted, [`p:${p}`]: !accepted[`p:${p}`] })}
                  title={PATTERN_AVOID_LABELS[p] ?? p}
                  sub="We read this as: avoid this movement. Is that right?"
                />
              ))}
            </div>
          )}

          {result.rom_limits.length > 0 && (
            <div className="animate-rise space-y-2 [animation-delay:180ms]">
              <h2 className="font-display px-1 text-base font-semibold">Range of motion</h2>
              {result.rom_limits.map((m, i) => (
                <ToggleCard
                  key={`m${i}`}
                  on={!!accepted[`m${i}`]}
                  onToggle={() => setAccepted({ ...accepted, [`m${i}`]: !accepted[`m${i}`] })}
                  title={`${REGION_LABELS[m.joint] ?? m.joint} ${m.motion} limited to ~${m.max_deg}°`}
                  sub="Deep-range exercises past this point will be left out."
                />
              ))}
            </div>
          )}

          <div className="animate-rise space-y-2 [animation-delay:240ms]">
            <h2 className="font-display px-1 text-base font-semibold">Impact</h2>
            <ToggleCard
              on={!!accepted["impact"]}
              onToggle={() => setAccepted({ ...accepted, impact: !accepted["impact"] })}
              title={`Keep impact at "${result.cardio_impact_ceiling}" or below`}
              sub="Running and jumping stay out of the plan above this level."
            />
          </div>

          {result.notes_for_user.length > 0 && (
            <div className="animate-rise rounded-2xl bg-mist/50 p-4 text-sm text-ink/70 [animation-delay:300ms]">
              {result.notes_for_user.map((n) => (
                <p key={n}>• {n}</p>
              ))}
            </div>
          )}

          {result.unparsed_flags.length > 0 && (
            <div className="animate-rise rounded-2xl bg-ochre/10 p-4 text-sm text-ochre [animation-delay:340ms]">
              <p className="font-medium">We couldn't read everything:</p>
              {result.unparsed_flags.map((f) => (
                <p key={f}>• {f}</p>
              ))}
              <p className="mt-1 text-xs">
                Anything missing can be added by hand in the Limits tab.
              </p>
            </div>
          )}

          <button
            onClick={confirm}
            className="animate-rise w-full rounded-xl bg-moss px-6 py-3.5 font-medium text-paper transition-transform active:scale-[0.98] [animation-delay:380ms]"
          >
            Looks right — apply to my plan
          </button>
          <button
            onClick={() => {
              setResult(null);
              setPhase("pick");
            }}
            className="w-full py-1 text-center text-xs text-ink/50 underline-offset-2 hover:underline"
          >
            Start over with a different file
          </button>
        </section>
      ) : (
        <section className="animate-rise space-y-4 text-center">
          <div className="rounded-3xl border border-moss/30 bg-moss/5 p-6">
            <p className="font-display text-xl font-semibold text-moss">
              Your paperwork is gone.
            </p>
            <p className="mt-2 text-sm text-ink/70">
              We kept only what we needed — the limits you just approved. The
              document itself was never stored, and your plan already works
              around them.
            </p>
          </div>
          <a
            href="#/"
            className="block w-full rounded-xl bg-moss px-6 py-3.5 font-medium text-paper transition-transform active:scale-[0.98]"
          >
            See today's plan
          </a>
          <a
            href="#/constraints"
            className="block w-full py-1 text-center text-sm text-ink/60 underline-offset-2 hover:underline"
          >
            Review your limits
          </a>
        </section>
      )}
    </main>
  );
}

function ToggleCard({
  on,
  onToggle,
  title,
  sub,
  flag,
}: {
  on: boolean;
  onToggle: () => void;
  title: string;
  sub: string;
  flag?: string;
}) {
  return (
    <button
      onClick={onToggle}
      aria-pressed={on}
      className={`flex w-full items-start justify-between gap-3 rounded-2xl border p-4 text-left transition-colors ${
        on ? "border-moss bg-moss/5" : "border-mist bg-card opacity-60"
      }`}
    >
      <span>
        <span className="block text-sm font-medium first-letter:uppercase">{title}</span>
        <span className="mt-0.5 block text-xs text-ink/55">{sub}</span>
        {flag && <span className="mt-0.5 block text-xs text-ochre">{flag}</span>}
      </span>
      <span
        className={`font-data mt-0.5 shrink-0 rounded-full px-2.5 py-1 text-xs ${
          on ? "bg-moss text-paper" : "bg-mist text-ink/60"
        }`}
      >
        {on ? "on" : "off"}
      </span>
    </button>
  );
}
