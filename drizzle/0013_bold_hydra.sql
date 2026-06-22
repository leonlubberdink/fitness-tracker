ALTER TABLE "users" ADD COLUMN "current_bodyweight_kg" numeric(6, 2);--> statement-breakpoint
ALTER TABLE "workout_sessions" ADD COLUMN "bodyweight_kg" numeric(6, 2);
