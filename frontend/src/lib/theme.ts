/** Appearance preference: auto (follow the system), light, dark, or pink. */
export type ThemePref = "auto" | "light" | "dark" | "pink";

const KEY = "af.theme.v1";

export function getThemePref(): ThemePref {
  try {
    const v = localStorage.getItem(KEY);
    return v === "light" || v === "dark" || v === "pink" ? v : "auto";
  } catch {
    return "auto";
  }
}

export function setThemePref(pref: ThemePref): void {
  try {
    if (pref === "auto") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, pref);
  } catch {
    // Storage unavailable — the in-session attribute still applies below.
  }
  applyTheme(pref);
}

export function applyTheme(pref: ThemePref = getThemePref()): void {
  const root = document.documentElement;
  if (pref === "auto") delete root.dataset.theme;
  else root.dataset.theme = pref;
}
