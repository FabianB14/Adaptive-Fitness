import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App";
import { getApiBase } from "./lib/env";
import { resubscribeIfEnabled } from "./lib/push";
import { applyTheme } from "./lib/theme";
import "./styles/theme.css";

applyTheme();

// autoUpdate: new deploys activate on next open. The device is never the
// source of truth, so a stale shell for one session is fine.
registerSW({ immediate: true });

// Quietly refresh the push subscription on the server — this is what lets
// the server's subscription store be ephemeral without anyone noticing.
resubscribeIfEnabled(getApiBase() ?? null);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
