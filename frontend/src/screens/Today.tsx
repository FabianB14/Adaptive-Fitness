import { useEffect, useMemo, useState } from "react";
import { ReadinessMap } from "../components/ReadinessMap";
import { loadConstraints } from "../lib/constraints";
import { API_BASE } from "../lib/env";
import { generatePlan, type PlannedItem } from "../lib/planner";
import {
  isFirebaseConfigured,
  signIn,
  signOutUser,
  watchAuth,
  type User,
} from "../lib/firebase";

type ServerStatus = "checking" | "connected" | "static";
type TierKey = "full" | "light" | "minimum";

const TIERS: { key: TierKey; name: string; desc: string; accent: string }[] = [
  { key: "full", name: "Full", desc: "The programmed session", accent: "bg-moss" },
  { key: "light", name: "Light", desc: "Same movements, easier day", accent: "bg-periwinkle" },
  { key: "minimum", name: "Minimum", desc: "Five minutes. It counts.", accent: "bg-ochre" },
];

/**
 * The daily view. The Readiness Map draws in first, then the three day-cards
 * settle into place — three true equals, all generated from the same
 * constraint filter. Logging arrives with step 5.
 */
export function Today() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(!isFirebaseConfigured);
  const [server, setServer] = useState<ServerStatus>(
    API_BASE ? "checking" : "static",
  );
  const [openTier, setOpenTier] = useState<TierKey | null>(null);

  const constraints = useMemo(() => loadConstraints(), []);
  const plan = useMemo(
    () => generatePlan(constraints, new Date().toISOString().slice(0, 10)),
    [constraints],
  );

  useEffect(() => watchAuth((u) => (setUser(u), setAuthReady(true))), []);

  useEffect(() => {
    if (!API_BASE) return;
    fetch(`${API_BASE}/health`)
      .then((r) => setServer(r.ok ? "connected" : "static"))
      .catch(() => setServer("static"));
  }, []);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-7 px-6 py-10">
      <header className="animate-rise flex items-baseline justify-between">
        <h1 className="font-display text-2xl font-semibold">Today</h1>
        {authReady &&
          (user ? (
            <button
              onClick={signOutUser}
              className="text-sm text-ink/60 underline-offset-2 hover:underline"
            >
              Sign out
            </button>
          ) : isFirebaseConfigured ? (
            <button
              onClick={() => signIn().catch(() => {})}
              className="rounded-lg bg-moss px-4 py-2 text-sm font-medium text-paper transition-transform active:scale-[0.97]"
            >
              Sign in
            </button>
          ) : null)}
      </header>

      <ReadinessMap constraints={constraints} />

      <a
        href="#/constraints"
        className="animate-rise mx-auto -mt-3 text-sm text-moss underline-offset-2 hover:underline [animation-delay:400ms]"
      >
        Adjust your limits
      </a>

      {plan.notes.map((n) => (
        <p
          key={n}
          className="animate-rise rounded-2xl bg-mist/50 px-4 py-3 text-center text-sm text-ink/70 [animation-delay:480ms]"
        >
          {n}
        </p>
      ))}

      {/* Three equal peers. Every one continues the streak. */}
      <section className="space-y-3" aria-label="Choose today's session">
        {TIERS.map((t, i) => (
          <TierCard
            key={t.key}
            name={t.name}
            desc={t.desc}
            accent={t.accent}
            items={plan[t.key]}
            open={openTier === t.key}
            onToggle={() => setOpenTier(openTier === t.key ? null : t.key)}
            delay={560 + i * 110}
          />
        ))}
        <button className="animate-rise w-full rounded-2xl border border-dashed border-mist p-4 text-sm text-ink/60 transition-transform active:scale-[0.985] [animation-delay:890ms]">
          Resting today — that's a choice, and it counts too
        </button>
      </section>

      <footer className="animate-rise mt-auto flex items-center justify-between text-xs text-ink/40 [animation-delay:1000ms]">
        <span className="font-data">
          v0.3.0 ·{" "}
          <a href="#/library" className="underline-offset-2 hover:underline">
            library
          </a>
        </span>
        <span className="font-data">
          {server === "checking" && "server: checking…"}
          {server === "connected" && "server: connected"}
          {server === "static" && "on-device plan"}
        </span>
      </footer>
    </main>
  );
}

function TierCard({
  name,
  desc,
  accent,
  items,
  open,
  onToggle,
  delay,
}: {
  name: string;
  desc: string;
  accent: string;
  items: PlannedItem[];
  open: boolean;
  onToggle: () => void;
  delay: number;
}) {
  return (
    <div
      className="animate-rise rounded-2xl border border-mist bg-white"
      style={{ animationDelay: `${delay}ms` }}
    >
      <button
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-4 p-5 text-left transition-transform active:scale-[0.99]"
      >
        <span className={`h-10 w-1.5 shrink-0 rounded-full ${accent}`} />
        <span className="flex-1">
          <span className="font-display block text-lg font-semibold">{name}</span>
          <span className="block text-sm text-ink/60">{desc}</span>
        </span>
        <span className="font-data text-xs text-ink/40">
          {items.length} {items.length === 1 ? "item" : "items"}
        </span>
      </button>
      {open && (
        <ul className="space-y-3 border-t border-mist p-5 pt-4">
          {items.map(({ exercise, dose, note }) => (
            <li key={exercise.slug} className="flex items-start justify-between gap-3">
              <span>
                <span className="block text-sm font-medium">{exercise.name}</span>
                <span className="block text-xs text-ink/50">{exercise.cue}</span>
                {note && (
                  <span className="mt-0.5 block text-xs text-ochre">{note}</span>
                )}
              </span>
              <span className="font-data shrink-0 text-sm text-ink/70">{dose}</span>
            </li>
          ))}
          {items.length === 0 && (
            <li className="text-sm text-ink/60">
              Your current limits close out this tier for today — the others
              are ready when you are.
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
