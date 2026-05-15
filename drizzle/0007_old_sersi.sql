CREATE TYPE "public"."plan_status" AS ENUM('draft', 'active', 'completed', 'archived');--> statement-breakpoint
CREATE TYPE "public"."plan_workout_state" AS ENUM('planned', 'skipped', 'completed');--> statement-breakpoint
CREATE TABLE "plan_workouts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"plan_id" uuid NOT NULL,
	"workout_template_id" uuid NOT NULL,
	"state" "plan_workout_state" DEFAULT 'planned' NOT NULL,
	"week_number" integer NOT NULL,
	"weekday" integer NOT NULL,
	"linked_workout_session_id" uuid,
	"skipped_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "plan_workouts_week_number_check" CHECK ("plan_workouts"."week_number" > 0),
	CONSTRAINT "plan_workouts_weekday_check" CHECK ("plan_workouts"."weekday" >= 1 and "plan_workouts"."weekday" <= 7)
);
--> statement-breakpoint
CREATE TABLE "plans" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"goal" text NOT NULL,
	"duration_weeks" integer NOT NULL,
	"status" "plan_status" DEFAULT 'draft' NOT NULL,
	"start_date" text,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "plans_duration_weeks_check" CHECK ("plans"."duration_weeks" > 0)
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "time_zone" text DEFAULT 'UTC' NOT NULL;--> statement-breakpoint
ALTER TABLE "workout_sessions" ADD COLUMN "plan_id" uuid;--> statement-breakpoint
ALTER TABLE "workout_sessions" ADD COLUMN "plan_workout_id" uuid;--> statement-breakpoint
ALTER TABLE "plan_workouts" ADD CONSTRAINT "plan_workouts_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_workouts" ADD CONSTRAINT "plan_workouts_workout_template_id_workout_templates_id_fk" FOREIGN KEY ("workout_template_id") REFERENCES "public"."workout_templates"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plans" ADD CONSTRAINT "plans_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "plan_workouts_plan_idx" ON "plan_workouts" USING btree ("plan_id","week_number","weekday");--> statement-breakpoint
CREATE UNIQUE INDEX "plan_workouts_plan_weekday_unique_idx" ON "plan_workouts" USING btree ("plan_id","week_number","weekday");--> statement-breakpoint
CREATE UNIQUE INDEX "plan_workouts_linked_session_unique_idx" ON "plan_workouts" USING btree ("linked_workout_session_id") WHERE "plan_workouts"."linked_workout_session_id" is not null;--> statement-breakpoint
CREATE INDEX "plans_user_status_idx" ON "plans" USING btree ("user_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "plans_user_active_unique_idx" ON "plans" USING btree ("user_id") WHERE "plans"."status" = 'active';--> statement-breakpoint
ALTER TABLE "workout_sessions" ADD CONSTRAINT "workout_sessions_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_sessions" ADD CONSTRAINT "workout_sessions_plan_workout_id_plan_workouts_id_fk" FOREIGN KEY ("plan_workout_id") REFERENCES "public"."plan_workouts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "workout_sessions_plan_idx" ON "workout_sessions" USING btree ("plan_id","plan_workout_id");--> statement-breakpoint
CREATE UNIQUE INDEX "workout_sessions_plan_workout_unique_idx" ON "workout_sessions" USING btree ("plan_workout_id") WHERE "workout_sessions"."plan_workout_id" is not null;