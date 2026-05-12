import { z } from "zod";

const uuidField = (message: string) => z.string().trim().uuid(message);

const positiveIntegerString = z
  .string()
  .trim()
  .min(1, "Reps is required.")
  .refine((value) => /^\d+$/.test(value), "Reps must be a whole number.")
  .transform((value) => Number.parseInt(value, 10))
  .refine((value) => value > 0, "Reps must be at least 1.");

const nonNegativeNumberString = z
  .string()
  .trim()
  .min(1, "Weight is required.")
  .refine((value) => Number.isFinite(Number.parseFloat(value)), "Weight must be a number.")
  .transform((value) => Math.round(Number.parseFloat(value) * 100) / 100)
  .refine((value) => value >= 0, "Weight must be 0 or higher.");

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

export const createWorkoutSetSchema = workoutEntrySchema.extend({
  reps: positiveIntegerString,
  weight: nonNegativeNumberString,
});

export const workoutSetMutationSchema = workoutSessionIdSchema.extend({
  setId: uuidField("Invalid workout set."),
});

export const updateWorkoutSetSchema = workoutSetMutationSchema.extend({
  reps: positiveIntegerString,
  weight: nonNegativeNumberString,
});
