import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { TabBar } from "./components/TabBar";
import { detectEnv } from "./lib/env";
import { ConstraintsScreen } from "./screens/Constraints";
import { InstallGate } from "./screens/InstallGate";
import { Library } from "./screens/Library";
import { OpenInSafari } from "./screens/OpenInSafari";
import { ProgressScreen } from "./screens/Progress";
import { Session } from "./screens/Session";
import { isOnboarded, Setup } from "./screens/Setup";
import { Today } from "./screens/Today";
import { Upload } from "./screens/Upload";

const Food = lazy(() =>
  import("./screens/Food").then((module) => ({ default: module.Food })),
);
const MealPlan = lazy(() =>
  import("./screens/MealPlan").then((module) => ({ default: module.MealPlan })),
);
const WeeklyPlan = lazy(() =>
  import("./screens/WeeklyPlan").then((module) => ({
    default: module.WeeklyPlan,
  })),
);
const WorkoutCalendar = lazy(() =>
  import("./screens/WorkoutCalendar").then((module) => ({
    default: module.WorkoutCalendar,
  })),
);

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

  // First run (or explicit #/setup): the intake wizard owns the screen.
  if (route.startsWith("#/setup") || !isOnboarded()) {
    return <Setup />;
  }

  const sessionMatch = route.match(/^#\/session\/(full|light|minimum)/);
  const screen = sessionMatch ? (
    <Session
      key={sessionMatch[1]}
      tier={sessionMatch[1] as "full" | "light" | "minimum"}
    />
  ) : route.startsWith("#/plan") ? (
    <WeeklyPlan />
  ) : route.startsWith("#/library") ? (
    <Library />
  ) : route.startsWith("#/constraints") ? (
    <ConstraintsScreen />
  ) : route.startsWith("#/meals") ? (
    <MealPlan />
  ) : route.startsWith("#/food") ? (
    <Food />
  ) : route.startsWith("#/calendar") ? (
    <WorkoutCalendar />
  ) : route.startsWith("#/progress") ? (
    <ProgressScreen />
  ) : route.startsWith("#/upload") ? (
    <Upload />
  ) : (
    <Today />
  );

  return (
    <>
      <Suspense
        fallback={
          <main role="status" className="mx-auto max-w-md px-5 pt-8">
            Loading your plan…
          </main>
        }
      >
        {screen}
      </Suspense>
      <TabBar route={route} />
    </>
  );
}
