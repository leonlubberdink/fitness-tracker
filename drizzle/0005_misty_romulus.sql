CREATE TABLE "workout_template_exercises" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workout_template_id" uuid NOT NULL,
	"exercise_id" uuid NOT NULL,
	"sort_order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workout_templates" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "workout_sessions" ADD COLUMN "active_entry_sort_order" integer;--> statement-breakpoint
ALTER TABLE "workout_template_exercises" ADD CONSTRAINT "workout_template_exercises_workout_template_id_workout_templates_id_fk" FOREIGN KEY ("workout_template_id") REFERENCES "public"."workout_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_template_exercises" ADD CONSTRAINT "workout_template_exercises_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_templates" ADD CONSTRAINT "workout_templates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "workout_template_exercises_template_idx" ON "workout_template_exercises" USING btree ("workout_template_id");--> statement-breakpoint
CREATE UNIQUE INDEX "workout_template_exercises_template_sort_unique_idx" ON "workout_template_exercises" USING btree ("workout_template_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "workout_template_exercises_template_exercise_unique_idx" ON "workout_template_exercises" USING btree ("workout_template_id","exercise_id");--> statement-breakpoint
CREATE INDEX "workout_templates_user_idx" ON "workout_templates" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "workout_templates_user_name_lower_unique_idx" ON "workout_templates" USING btree ("user_id",lower("name"));