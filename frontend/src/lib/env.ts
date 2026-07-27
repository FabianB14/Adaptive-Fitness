/**
 * Runtime environment detection for the iOS PWA install flow.
 *
 * The rules this encodes:
 * - Add to Home Screen only works from Safari, so in-app browsers
 *   (Instagram, Messenger, …) must be routed to Safari first.
 * - Web push only works after install, so onboarding drives install
 *   before ever asking for notification permission.
 */

export interface RuntimeEnv {
  isIOS: boolean;
  /** Real Safari on iOS — the only place Add to Home Screen works. */
  isIOSSafari: boolean;
  /** Instagram, Facebook, Messenger, TikTok, LinkedIn, Line, Snapchat, Twitter/X. */
  isInAppBrowser: boolean;
  /** Already installed to the home screen (standalone display mode). */
  isStandalone: boolean;
}

const IN_APP_PATTERNS =
  /Instagram|FBAN|FBAV|FB_IAB|Messenger|Line\/|MicroMessenger|Snapchat|LinkedInApp|BytedanceWebview|TikTok|Twitter/i;

export function detectEnv(
  ua: string = navigator.userAgent,
  nav: Navigator = navigator,
): RuntimeEnv {
  // iPadOS 13+ reports as "Macintosh" but has touch points.
  const isIOS =
    /iPhone|iPad|iPod/.test(ua) ||
    (/Macintosh/.test(ua) && nav.maxTouchPoints > 1);

  const isInAppBrowser = IN_APP_PATTERNS.test(ua);

  // On iOS every browser is WebKit; "Safari" appears in most UAs. Real Safari
  // is: iOS + Safari token + not an in-app shell + not another named browser.
  const isOtherIOSBrowser = /CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo|Brave/i.test(ua);
  const isIOSSafari =
    isIOS && /Safari/i.test(ua) && !isInAppBrowser && !isOtherIOSBrowser;

  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS-only legacy flag, still the reliable signal in home-screen web apps.
    ("standalone" in nav && (nav as { standalone?: boolean }).standalone === true);

  return { isIOS, isIOSSafari, isInAppBrowser, isStandalone };
}

const API_BASE_KEY = "af.apibase.v1";

/** Backend base URL: a runtime override (set in the app, survives without a
    rebuild — how the Render URL gets in) wins over the build-time env var. */
export function getApiBase(): string | undefined {
  try {
    const stored = localStorage.getItem(API_BASE_KEY);
    if (stored) return stored.replace(/\/+$/, "");
  } catch {
    // Fall through to the build-time value.
  }
  return (import.meta.env.VITE_API_BASE as string | undefined) || undefined;
}

export function setApiBase(url: string): void {
  try {
    if (url.trim()) localStorage.setItem(API_BASE_KEY, url.trim());
    else localStorage.removeItem(API_BASE_KEY);
  } catch {
    // Storage unavailable — the value just won't persist.
  }
}

export const API_BASE: string | undefined = getApiBase();
