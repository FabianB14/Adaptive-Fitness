import { useState } from "react";
import { ExerciseFigure } from "./ExerciseFigure";
import { type Exercise } from "../lib/library";
export function ExerciseDemo({ exercise }: { exercise: Exercise }) {
  const [mode, setMode] = useState<"animate" | "pause" | "start" | "end">(
    "animate",
  );
  return (
    <figure className="mt-3 rounded-2xl border border-mist bg-paper p-4">
      <figcaption className="text-sm font-medium">
        Movement guide · {exercise.name}
      </figcaption>
      <div
        className="flex justify-center"
        role="img"
        aria-label={`Two-pose movement example for ${exercise.name}. ${exercise.cue}`}
      >
        <ExerciseFigure exercise={exercise} mode={mode} className="h-40 w-40" />
      </div>
      <div
        className="flex gap-2"
        role="group"
        aria-label={`${exercise.name} movement controls`}
      >
        <button
          onClick={() => setMode(mode === "animate" ? "pause" : "animate")}
          aria-pressed={mode === "animate"}
          className="flex-1 rounded-lg border border-mist px-2 py-2 text-xs"
        >
          {mode === "animate" ? "Pause" : "Play"}
        </button>
        <button
          onClick={() => setMode("start")}
          aria-pressed={mode === "start"}
          className="flex-1 rounded-lg border border-mist px-2 py-2 text-xs"
        >
          Start pose
        </button>
        <button
          onClick={() => setMode("end")}
          aria-pressed={mode === "end"}
          className="flex-1 rounded-lg border border-mist px-2 py-2 text-xs"
        >
          End pose
        </button>
      </div>
      <p className="mt-3 text-sm text-ink/80">{exercise.cue}</p>
      <p className="mt-2 text-xs text-ink/50">
        The figure illustrates the movement family. Follow the cue for this
        variation, use a comfortable range, and stop if it hurts. Reduced-motion
        settings show still poses.
      </p>
    </figure>
  );
}
