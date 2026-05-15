import { z } from "zod";

import type { ExerciseUnit } from "@/lib/exercise-units";

const uuidField = (message: string) => z.string().trim().uuid(message);

const positiveIntegerString = z
  .string()
  .trim()
  .min(1, "Reps is required.")
  .refine((value) => /^\d+$/.test(value), "Reps must be a whole number.")
  .transform((value) => Number.parseInt(value, 10))
  .refine((value) => value > 0, "Reps must be at least 1.");

function getMetricSchema(unit: ExerciseUnit) {
  if (unit === "time") {
    return z
      .string()
      .trim()
      .min(1, "Time is required.")
      .refine(
        (value) => /^\d+$/.test(value),
        "Time must be a whole number of seconds.",
      )
      .transform((value) => Number.parseInt(value, 10))
      .refine((value) => value > 0, "Time must be at least 1 second.");
  }

  return z
    .string()
    .trim()
    .min(1, unit === "bodyweight" ? "Load is required." : "Weight is required.")
    .refine(
      (value) => Number.isFinite(Number.parseFloat(value)),
      unit === "bodyweight" ? "Load must be a number." : "Weight must be a number.",
    )
    .transform((value) => Math.round(Number.parseFloat(value) * 100) / 100);
}

export const startWorkoutSessionSchema = z.object({});

export const workoutSessionIdSchema = z.object({
  sessionId: uuidField("Invalid workout session."),
});

export const addExerciseEntrySchema = workoutSessionIdSchema.extend({
  exerciseId: uuidField("Choose a valid exercise."),
});

export const workoutEntrySchema = workoutSessionIdSchema.extend({
  entryId: uuidField("Invalid workout exercise entry."),
});

export const reorderWorkoutEntriesSchema = workoutSessionIdSchema.extend({
  entryIds: z
    .array(uuidField("Invalid workout exercise entry."))
    .min(1, "Add at least one planned exercise before reordering.")
    .refine(
      (entryIds) => new Set(entryIds).size === entryIds.length,
      "Provide a valid exercise order.",
    ),
});

export const workoutSetMutationSchema = workoutSessionIdSchema.extend({
  setId: uuidField("Invalid workout set."),
});

export function parseWorkoutSetFields(
  unit: ExerciseUnit,
  values: {
    reps: string;
    weight: string;
  },
) {
  return z
    .object({
      reps: positiveIntegerString,
      weight: getMetricSchema(unit),
    })
    .safeParse(values);
}
