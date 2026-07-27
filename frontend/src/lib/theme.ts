/** Appearance preference: auto (follow the system), light, or dark. */
export type ThemePref = "auto" | "light" | "dark";

const KEY = "af.theme.v1";

export function getThemePref(): ThemePref {
  const v = localStorage.getItem(KEY);
  return v === "light" || v === "dark" ? v : "auto";
}

export function setThemePref(pref: ThemePref): void {
  try {
    if (pref === "auto") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, pref);
  } catch {
    // Storage unavailable — the in-session attribute still applies below.
  }
  applyTheme();
}

export function applyTheme(): void {
  const pref = getThemePref();
  const root = document.documentElement;
  if (pref === "auto") delete root.dataset.theme;
  else root.dataset.theme = pref;
}
