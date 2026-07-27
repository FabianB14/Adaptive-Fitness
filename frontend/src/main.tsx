import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App";
import { applyTheme } from "./lib/theme";
import "./styles/theme.css";

applyTheme();

// autoUpdate: new deploys activate on next open. The device is never the
// source of truth, so a stale shell for one session is fine.
registerSW({ immediate: true });

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
