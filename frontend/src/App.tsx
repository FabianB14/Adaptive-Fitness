import { useMemo, useState } from "react";
import { detectEnv } from "./lib/env";
import { InstallGate } from "./screens/InstallGate";
import { OpenInSafari } from "./screens/OpenInSafari";
import { Today } from "./screens/Today";

const INSTALL_GATE_DISMISSED_KEY = "af.installGate.dismissed";

export default function App() {
  const env = useMemo(() => detectEnv(), []);
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(INSTALL_GATE_DISMISSED_KEY) === "1",
  );

  // In-app browsers can't Add to Home Screen — route to Safari first.
  if (env.isInAppBrowser) return <OpenInSafari />;

  // iOS Safari, not yet installed: drive install before anything else.
  if (env.isIOSSafari && !env.isStandalone && !dismissed) {
    return (
      <InstallGate
        onContinue={() => {
          localStorage.setItem(INSTALL_GATE_DISMISSED_KEY, "1");
          setDismissed(true);
        }}
      />
    );
  }

  return <Today />;
}
