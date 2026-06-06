ALTER TABLE "workout_sessions" ADD COLUMN "workout_template_id" uuid;--> statement-breakpoint
ALTER TABLE "workout_templates" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "workout_sessions" ADD CONSTRAINT "workout_sessions_workout_template_id_workout_templates_id_fk" FOREIGN KEY ("workout_template_id") REFERENCES "public"."workout_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "workout_sessions_template_idx" ON "workout_sessions" USING btree ("workout_template_id");