"use client";

import { useActionState } from "react";

import { createExerciseAction } from "@/features/exercises/actions";
import {
  EXERCISE_UNITS,
  initialCreateExerciseActionState,
} from "@/features/exercises/state";

export function ExerciseCreateForm() {
  const [state, formAction, isPending] = useActionState(
    createExerciseAction,
    initialCreateExerciseActionState,
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-foreground">Name</span>
          <input
            type="text"
            name="name"
            placeholder="Barbell bench press"
            className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none placeholder:text-muted"
            required
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-foreground">Category</span>
          <input
            type="text"
            name="category"
            placeholder="Chest"
            className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none placeholder:text-muted"
            required
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-foreground">
            Default unit
          </span>
          <select
            name="defaultUnit"
            defaultValue="kg"
            className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none"
          >
            {EXERCISE_UNITS.map((unit) => (
              <option key={unit} value={unit}>
                {unit === "kg" ? "kg" : "bodyweight"}
              </option>
            ))}
          </select>
        </label>
      </div>

      {state.error ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}

      {state.success ? (
        <p className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {state.success}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="flex min-h-11 w-full items-center justify-center rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-accent-foreground transition-opacity disabled:opacity-70"
      >
        {isPending ? "Creating exercise..." : "Create exercise"}
      </button>
    </form>
  );
}
