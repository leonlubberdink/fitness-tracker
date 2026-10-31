CREATE TYPE "public"."workout_reps_basis" AS ENUM('total', 'per_side');--> statement-breakpoint
CREATE TYPE "public"."workout_session_status" AS ENUM('in_progress', 'completed', 'partial', 'aborted', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."workout_set_side" AS ENUM('bilateral', 'left', 'right', 'both_sides', 'alternating');--> statement-breakpoint
CREATE TYPE "public"."workout_set_status" AS ENUM('completed', 'incomplete', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."workout_set_type" AS ENUM('warmup', 'working');--> statement-breakpoint
ALTER TYPE "public"."plan_workout_state" ADD VALUE 'partial';--> statement-breakpoint
ALTER TYPE "public"."plan_workout_state" ADD VALUE 'aborted';--> statement-breakpoint
DROP INDEX "workout_sessions_user_open_unique_idx";--> statement-breakpoint
ALTER TABLE "workout_sets" ALTER COLUMN "reps" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "workout_sets" ALTER COLUMN "weight" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "workout_sets" ALTER COLUMN "weight" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "exercises" ADD COLUMN "metadata" jsonb;--> statement-breakpoint
ALTER TABLE "plan_workouts" ADD COLUMN "skipped_prescription_snapshot" jsonb;--> statement-breakpoint
ALTER TABLE "workout_exercise_entries" ADD COLUMN "exercise_id_snapshot" uuid;--> statement-breakpoint
ALTER TABLE "workout_exercise_entries" ADD COLUMN "metadata_snapshot" jsonb;--> statement-breakpoint
ALTER TABLE "workout_exercise_entries" ADD COLUMN "status" text;--> statement-breakpoint
ALTER TABLE "workout_sessions" ADD COLUMN "ended_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "workout_sessions" ADD COLUMN "status" "workout_session_status";--> statement-breakpoint
ALTER TABLE "workout_sets" ADD COLUMN "rir" integer;--> statement-breakpoint
ALTER TABLE "workout_sets" ADD COLUMN "set_type" "workout_set_type";--> statement-breakpoint
ALTER TABLE "workout_sets" ADD COLUMN "status" "workout_set_status";--> statement-breakpoint
ALTER TABLE "workout_sets" ADD COLUMN "side" "workout_set_side";--> statement-breakpoint
ALTER TABLE "workout_sets" ADD COLUMN "reps_basis" "workout_reps_basis";--> statement-breakpoint
CREATE UNIQUE INDEX "workout_sessions_user_open_unique_idx" ON "workout_sessions" USING btree ("user_id") WHERE "workout_sessions"."completed_at" is null and "workout_sessions"."ended_at" is null;--> statement-breakpoint
ALTER TABLE "workout_sets" ADD CONSTRAINT "workout_sets_rir_check" CHECK ("workout_sets"."rir" is null or "workout_sets"."rir" >= 0);--> statement-breakpoint
ALTER TABLE "workout_sets" ADD CONSTRAINT "workout_sets_completed_metrics_check" CHECK ("workout_sets"."status" is distinct from 'completed' or ("workout_sets"."reps" is not null and "workout_sets"."weight" is not null));