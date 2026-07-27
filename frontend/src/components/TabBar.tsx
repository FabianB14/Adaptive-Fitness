interface Tab {
  href: string;
  label: string;
  isActive: (route: string) => boolean;
  icon: (active: boolean) => React.ReactNode;
}

const stroke = (active: boolean) => ({
  fill: "none",
  stroke: "currentColor",
  strokeWidth: active ? 2.2 : 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
});

const TABS: Tab[] = [
  {
    href: "#/",
    label: "Today",
    isActive: (r) =>
      !r.startsWith("#/library") &&
      !r.startsWith("#/constraints") &&
      !r.startsWith("#/food") &&
      !r.startsWith("#/progress"),
    icon: (a) => (
      <svg viewBox="0 0 24 24" className="h-6 w-6" {...stroke(a)}>
        <path d="M4 11.5 12 5l8 6.5" />
        <path d="M6.5 10.5V19h11v-8.5" />
      </svg>
    ),
  },
  {
    href: "#/food",
    label: "Food",
    isActive: (r) => r.startsWith("#/food"),
    icon: (a) => (
      <svg viewBox="0 0 24 24" className="h-6 w-6" {...stroke(a)}>
        <path d="M12 8.5c-4.5-3.5-9 .5-7 5.5s5.5 6 7 4.5c1.5 1.5 5-.5 7-4.5s-2.5-9-7-5.5Z" />
        <path d="M12 8.5V6c0-1.5 1-2.5 2.5-2.5" />
      </svg>
    ),
  },
  {
    href: "#/progress",
    label: "Progress",
    isActive: (r) => r.startsWith("#/progress"),
    icon: (a) => (
      <svg viewBox="0 0 24 24" className="h-6 w-6" {...stroke(a)}>
        <path d="M4 19.5V13M9.5 19.5V8M15 19.5v-8.5M20.5 19.5v-15" />
      </svg>
    ),
  },
  {
    href: "#/library",
    label: "Library",
    isActive: (r) => r.startsWith("#/library"),
    icon: (a) => (
      <svg viewBox="0 0 24 24" className="h-6 w-6" {...stroke(a)}>
        <rect x="2.5" y="9" width="4" height="6" rx="1.5" />
        <rect x="17.5" y="9" width="4" height="6" rx="1.5" />
        <path d="M6.5 12h11" />
      </svg>
    ),
  },
  {
    href: "#/constraints",
    label: "Limits",
    isActive: (r) => r.startsWith("#/constraints"),
    icon: (a) => (
      <svg viewBox="0 0 24 24" className="h-6 w-6" {...stroke(a)}>
        <path d="M4 8h10M18 8h2M4 16h2M10 16h10" />
        <circle cx="16" cy="8" r="2.2" />
        <circle cx="8" cy="16" r="2.2" />
      </svg>
    ),
  },
];

/** Fixed bottom tab bar — the app shell's spine, MyFitnessPal-style.
    Sits above the iPhone home indicator via safe-area padding. */
export function TabBar({ route }: { route: string }) {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-10 border-t border-mist bg-paper/95 backdrop-blur"
    >
      <div className="mx-auto flex max-w-md">
        {TABS.map((t) => {
          const active = t.isActive(route);
          return (
            <a
              key={t.href}
              href={t.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 transition-colors ${
                active ? "text-moss" : "text-ink/40"
              }`}
            >
              {t.icon(active)}
              <span className={`text-[11px] ${active ? "font-semibold" : ""}`}>
                {t.label}
              </span>
            </a>
          );
        })}
      </div>
    </nav>
  );
}
