ALTER TABLE "workout_exercise_entries" DROP CONSTRAINT "workout_exercise_entries_exercise_id_exercises_id_fk";
--> statement-breakpoint
ALTER TABLE "workout_exercise_entries" ALTER COLUMN "exercise_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "workout_exercise_entries" ADD CONSTRAINT "workout_exercise_entries_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE set null ON UPDATE no action;