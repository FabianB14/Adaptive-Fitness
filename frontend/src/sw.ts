/// <reference lib="webworker" />
/**
 * Custom service worker: the same precached app shell as before, plus Web
 * Push. Notifications only ever show what the server sent — one cute,
 * kind nudge a day (see backend/app/services/push.py for the pool).
 */
import { clientsClaim } from "workbox-core";
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";

declare let self: ServiceWorkerGlobalScope;

self.skipWaiting();
clientsClaim();

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

const BASE = import.meta.env.BASE_URL;
registerRoute(new NavigationRoute(createHandlerBoundToURL(`${BASE}index.html`)));

interface PushPayload {
  title?: string;
  body?: string;
}

self.addEventListener("push", (event) => {
  let payload: PushPayload = {};
  try {
    payload = event.data?.json() ?? {};
  } catch {
    // Non-JSON push — fall back to the defaults below.
  }
  event.waitUntil(
    self.registration.showNotification(payload.title ?? "🌱 Adaptive Fitness", {
      body: payload.body ?? "Your plan is ready whenever you are.",
      icon: `${BASE}icon-192.png`,
      badge: `${BASE}icon-192.png`,
      tag: "af-daily", // one nudge replaces another — never a pile-up
      data: { url: BASE },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url: string = event.notification.data?.url ?? BASE;
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windows) => {
        for (const w of windows) {
          if ("focus" in w) return w.focus();
        }
        return self.clients.openWindow(url);
      }),
  );
});
