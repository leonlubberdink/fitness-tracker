ALTER TABLE "workout_sets" DROP CONSTRAINT "workout_sets_completed_metrics_check";--> statement-breakpoint
ALTER TABLE "exercises" DROP COLUMN "metadata";--> statement-breakpoint
ALTER TABLE "workout_exercise_entries" DROP COLUMN "metadata_snapshot";--> statement-breakpoint
ALTER TABLE "workout_sets" DROP COLUMN "status";--> statement-breakpoint
ALTER TABLE "workout_sets" DROP COLUMN "side";--> statement-breakpoint
DROP TYPE "public"."workout_set_side";--> statement-breakpoint
DROP TYPE "public"."workout_set_status";