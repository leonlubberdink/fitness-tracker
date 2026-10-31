import { z } from "zod";
import { SET_TYPES, REPS_BASES } from "@/lib/training-metadata";

import type { ExerciseUnit } from "@/lib/exercise-units";
import {
  isLoadRecommendation,
  type LoadRecommendation,
} from "@/features/workouts/load-recommendations";

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
      (value) =>
        /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value) &&
        Number.isFinite(Number(value)),
      unit === "bodyweight"
        ? "Load must be a number."
        : "Weight must be a number.",
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
    .min(1, "Add at least one exercise before reordering.")
    .refine(
      (entryIds) => new Set(entryIds).size === entryIds.length,
      "Provide a valid exercise order.",
    ),
});

export const workoutSetMutationSchema = workoutSessionIdSchema.extend({
  setId: uuidField("Invalid workout set."),
});

export function parseLoadRecommendation(value: string) {
  return z
    .string()
    .trim()
    .min(1, "Choose what to do with this exercise next time.")
    .refine(
      isLoadRecommendation,
      "Choose a valid next-time load recommendation.",
    )
    .transform((nextValue) => nextValue as LoadRecommendation)
    .safeParse(value);
}

export function parseWorkoutSetFields(
  unit: ExerciseUnit,
  values: { reps: string; weight: string },
) {
  return z
    .object({ reps: positiveIntegerString, weight: getMetricSchema(unit) })
    .safeParse(values);
}

const optionalEnum = <T extends readonly [string, ...string[]]>(values: T) =>
  z.union([z.literal("").transform(() => null), z.enum(values)]);

export function parseSetObservations(form: FormData) {
  const read = (name: string) => {
    const value = form.get(name);
    return typeof value === "string" ? value.trim() : "";
  };
  return z
    .object({
      // No server defaults: classifications must be submitted by the visible UI.
      setType: optionalEnum(SET_TYPES),
      repsBasis: optionalEnum(REPS_BASES),
      rir: z.union([
        z.literal("").transform(() => null),
        z
          .string()
          .regex(/^\d+$/, "RIR must be an exact nonnegative integer.")
          .transform(Number)
          .pipe(z.number().int().min(0).max(2147483647)),
      ]),
    })
    .refine((value) => value.rir === null || value.setType === "working", {
      message: "RIR is only recorded for performed working sets.",
    })
    .safeParse({
      setType: read("setType"),
      repsBasis: read("repsBasis"),
      rir: read("rir"),
    });
}
