import { z } from "zod";
import { EXERCISE_UNITS } from "@/lib/exercise-units";
import {
  plannedExerciseSnapshotSchema,
  SESSION_STATUSES,
  SET_TYPES,
  REPS_BASES,
} from "@/lib/training-metadata";
import { LOAD_RECOMMENDATIONS } from "./load-recommendations";

export const WORKOUT_EXPORT_VERSION = "2.0.0" as const;
const timestamp = z.iso.datetime({ offset: true });
const id = z.string().min(1);
const nullableText = z.string().nullable();
const counts = z.strictObject({
  working_sets: z.number().int().nonnegative(),
  warmup_sets: z.number().int().nonnegative(),
  unclassified_sets: z.number().int().nonnegative(),
});

export const exportRangeSchema = z
  .object({
    start: z.iso.date().optional(),
    end: z.iso.date().optional(),
  })
  .refine((range) => !range.start || !range.end || range.start <= range.end, {
    message: "Start date must be on or before end date.",
  });
export type ExportRange = z.infer<typeof exportRangeSchema>;

export const exportedLoadSchema = z.strictObject({
  kind: z.enum(["bodyweight", "unknown"]),
  basis: z.enum(["bodyweight_modifier", "unknown"]),
  value_kg: z.number().nullable(),
  added_kg: z.number().nonnegative().nullable(),
  assistance_kg: z.number().nonnegative().nullable(),
});

export const exportedSetSchema = z.strictObject({
  id,
  sequence: z.number().int().positive(),
  raw: z.strictObject({
    reps: z.number().int().positive().nullable(),
    weight: z.number().nullable(),
    unit: z.enum(EXERCISE_UNITS),
  }),
  reps: z.number().int().positive().nullable(),
  duration_s: z.number().nullable(),
  load: exportedLoadSchema.nullable(),
  rir: z.number().int().nonnegative().nullable(),
  set_type: z.enum(SET_TYPES).nullable(),
  reps_basis: z.enum(REPS_BASES).nullable(),
  created_at: timestamp,
});

export const workoutExportSchema = z.strictObject({
  schema_version: z.literal(WORKOUT_EXPORT_VERSION),
  exported_at: timestamp,
  time_zone: z.string().min(1),
  source_app: z.strictObject({
    name: z.literal("fitness-app"),
    version: z.string().min(1),
  }),
  coverage: z.strictObject({
    start_date: z.iso.date().nullable(),
    end_date: z.iso.date().nullable(),
    requested_start_date: z.iso.date().nullable(),
    requested_end_date: z.iso.date().nullable(),
    scope: z.enum(["all_available_history", "date_range"]),
    includes_skipped_sessions: z.boolean(),
    session_count: z.number().int().nonnegative(),
    set_count: z.number().int().nonnegative(),
    skipped_planned_workout_count: z.number().int().nonnegative(),
    undated_skipped_workouts_excluded: z.number().int().nonnegative(),
  }),
  interpretation_notes: z.array(z.string()),
  exercise_catalog: z.array(
    z.strictObject({
      id,
      source: z.enum(["catalog", "entry_snapshot"]),
      name: z.string(),
      category: z.string(),
      default_unit: z.enum(EXERCISE_UNITS),
    }),
  ),
  sessions: z.array(
    z.strictObject({
      id,
      performed_on: z.iso.date(),
      started_at: timestamp,
      completed_at: timestamp.nullable(),
      ended_at: timestamp.nullable(),
      created_at: timestamp,
      updated_at: timestamp,
      status: z.enum(SESSION_STATUSES).nullable(),
      status_source: z.enum([
        "recorded",
        "derived_from_completed_at",
        "unknown",
      ]),
      plan_id: nullableText,
      plan_workout_id: nullableText,
      workout_template_id: nullableText,
      body_mass_kg: z.number().nullable(),
      counts,
      exercise_entries: z.array(
        z.strictObject({
          id,
          exercise_id: id,
          source_exercise_id: nullableText,
          exercise_id_snapshot: nullableText,
          order: z.number().int().positive(),
          exercise_name_snapshot: z.string(),
          exercise_category_snapshot: z.string(),
          unit: z.enum(EXERCISE_UNITS),
          status: z.literal("skipped").nullable(),
          prescription_snapshot: z.strictObject({
            sets_reps: nullableText,
            rest_time: nullableText,
            notes: nullableText,
          }),
          next_load_recommendation: z.enum(LOAD_RECOMMENDATIONS).nullable(),
          created_at: timestamp,
          counts,
          sets: z.array(exportedSetSchema),
        }),
      ),
    }),
  ),
  skipped_planned_workouts: z.array(
    z.strictObject({
      id,
      status: z.literal("skipped"),
      plan_id: id,
      workout_template_id: id,
      scheduled_on: z.iso.date().nullable(),
      skipped_at: timestamp.nullable(),
      prescription_snapshot: z.array(plannedExerciseSnapshotSchema).nullable(),
      created_at: timestamp,
      updated_at: timestamp,
    }),
  ),
});

export type WorkoutExport = z.infer<typeof workoutExportSchema>;

export function getWorkoutExportJsonSchema() {
  return {
    ...z.toJSONSchema(workoutExportSchema, { target: "draft-2020-12" }),
    title: "Fitness app strength history export 2.0.0",
    description:
      "Unknown values are null. Recorded source values are retained separately from deterministic interpretations. See docs/workout-export.md for cross-record rules.",
  };
}
