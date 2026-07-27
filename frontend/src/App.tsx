import { useEffect, useMemo, useState } from "react";
import { TabBar } from "./components/TabBar";
import { detectEnv } from "./lib/env";
import { ConstraintsScreen } from "./screens/Constraints";
import { Food } from "./screens/Food";
import { InstallGate } from "./screens/InstallGate";
import { Library } from "./screens/Library";
import { OpenInSafari } from "./screens/OpenInSafari";
import { Today } from "./screens/Today";

const INSTALL_GATE_DISMISSED_KEY = "af.installGate.dismissed";

function useHashRoute(): string {
  const [route, setRoute] = useState(() => window.location.hash);
  useEffect(() => {
    const onChange = () => setRoute(window.location.hash);
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return route;
}

export default function App() {
  const env = useMemo(() => detectEnv(), []);
  const route = useHashRoute();
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

  const screen = route.startsWith("#/library") ? (
    <Library />
  ) : route.startsWith("#/constraints") ? (
    <ConstraintsScreen />
  ) : route.startsWith("#/food") ? (
    <Food />
  ) : (
    <Today />
  );

  return (
    <>
      {screen}
      <TabBar route={route} />
    </>
  );
}
