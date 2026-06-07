ALTER TABLE "workout_exercise_entries" ADD COLUMN "sets_reps_snapshot" text;--> statement-breakpoint
ALTER TABLE "workout_exercise_entries" ADD COLUMN "rest_time_snapshot" text;--> statement-breakpoint
ALTER TABLE "workout_exercise_entries" ADD COLUMN "notes_snapshot" text;--> statement-breakpoint
ALTER TABLE "workout_template_exercises" ADD COLUMN "sets_reps" text;--> statement-breakpoint
ALTER TABLE "workout_template_exercises" ADD COLUMN "rest_time" text;--> statement-breakpoint
ALTER TABLE "workout_template_exercises" ADD COLUMN "notes" text;