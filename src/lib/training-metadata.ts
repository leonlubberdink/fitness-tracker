import { z } from "zod";
import { EXERCISE_UNITS } from "./exercise-units";

export const REPS_BASES = ["total", "per_side"] as const;
export const SET_TYPES = ["warmup", "working"] as const;
export const SESSION_STATUSES = [
  "in_progress",
  "completed",
  "partial",
  "aborted",
  "skipped",
] as const;

export const plannedExerciseSnapshotSchema = z.strictObject({
  id: z.string().min(1),
  exercise_id: z.string().min(1),
  exercise_name_snapshot: z.string(),
  exercise_category_snapshot: z.string(),
  unit: z.enum(EXERCISE_UNITS),
  order: z.number().int().positive(),
  sets_reps: z.string().nullable(),
  rest_time: z.string().nullable(),
  notes: z.string().nullable(),
});
export type PlannedExerciseSnapshot = z.infer<
  typeof plannedExerciseSnapshotSchema
>;
export type SetType = (typeof SET_TYPES)[number];
export type RepsBasis = (typeof REPS_BASES)[number];
export type SessionStatus = (typeof SESSION_STATUSES)[number];
