import { useEffect, useState } from "react";
import { ReadinessMap } from "../components/ReadinessMap";
import { API_BASE } from "../lib/env";
import {
  isFirebaseConfigured,
  signIn,
  signOutUser,
  watchAuth,
  type User,
} from "../lib/firebase";

type ServerStatus = "checking" | "connected" | "static";

/**
 * Step-1 daily view: the design system standing up — readiness map draws in,
 * then the three tier cards settle in with staggered easing. The three tiers
 * are visual equals by design: same size, same weight. No hierarchy that
 * makes Light or Minimum look like consolation prizes.
 */
export function Today() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(!isFirebaseConfigured);
  const [server, setServer] = useState<ServerStatus>(
    API_BASE ? "checking" : "static",
  );

  useEffect(() => watchAuth((u) => (setUser(u), setAuthReady(true))), []);

  useEffect(() => {
    if (!API_BASE) return;
    fetch(`${API_BASE}/health`)
      .then((r) => setServer(r.ok ? "connected" : "static"))
      .catch(() => setServer("static"));
  }, []);

  const tiers = [
    { name: "Full", desc: "The programmed session", accent: "bg-moss" },
    { name: "Light", desc: "Same movements, easier day", accent: "bg-periwinkle" },
    { name: "Minimum", desc: "Five minutes. It counts.", accent: "bg-ochre" },
  ];

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-8 px-6 py-10">
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
          ) : (
            <span className="text-xs text-ink/40">sign-in not configured</span>
          ))}
      </header>

      <ReadinessMap />

      {/* Three equal peers. Every one continues the streak. */}
      <section className="space-y-3" aria-label="Choose today's session">
        {tiers.map((t, i) => (
          <button
            key={t.name}
            className="animate-rise flex w-full items-center gap-4 rounded-2xl border border-mist bg-white p-5 text-left transition-transform active:scale-[0.985]"
            style={{ animationDelay: `${560 + i * 110}ms` }}
          >
            <span className={`h-10 w-1.5 shrink-0 rounded-full ${t.accent}`} />
            <span>
              <span className="font-display block text-lg font-semibold">
                {t.name}
              </span>
              <span className="block text-sm text-ink/60">{t.desc}</span>
            </span>
          </button>
        ))}
        <button
          className="animate-rise w-full rounded-2xl border border-dashed border-mist p-4 text-sm text-ink/60 transition-transform active:scale-[0.985] [animation-delay:890ms]"
        >
          Resting today — that's a choice, and it counts too
        </button>
      </section>

      <footer className="animate-rise mt-auto flex items-center justify-between text-xs text-ink/40 [animation-delay:1000ms]">
        <span className="font-data">
          v0.2.0 ·{" "}
          <a href="#/library" className="underline-offset-2 hover:underline">
            library
          </a>
        </span>
        <span className="font-data">
          {server === "checking" && "server: checking…"}
          {server === "connected" && "server: connected"}
          {server === "static" && "static preview"}
        </span>
      </footer>
    </main>
  );
}
