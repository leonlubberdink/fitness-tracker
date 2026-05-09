CREATE TABLE "workout_exercise_entries" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workout_session_id" uuid NOT NULL,
	"exercise_id" uuid NOT NULL,
	"exercise_name_snapshot" text NOT NULL,
	"exercise_category_snapshot" text NOT NULL,
	"unit_snapshot" "exercise_unit" NOT NULL,
	"sort_order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workout_sessions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"performed_on" date NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workout_sets" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workout_exercise_entry_id" uuid NOT NULL,
	"set_number" integer NOT NULL,
	"reps" integer NOT NULL,
	"weight" numeric(6, 2) DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workout_sets_reps_check" CHECK ("workout_sets"."reps" > 0),
	CONSTRAINT "workout_sets_weight_check" CHECK ("workout_sets"."weight" >= 0)
);
--> statement-breakpoint
ALTER TABLE "workout_exercise_entries" ADD CONSTRAINT "workout_exercise_entries_workout_session_id_workout_sessions_id_fk" FOREIGN KEY ("workout_session_id") REFERENCES "public"."workout_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_exercise_entries" ADD CONSTRAINT "workout_exercise_entries_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_sessions" ADD CONSTRAINT "workout_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_sets" ADD CONSTRAINT "workout_sets_workout_exercise_entry_id_workout_exercise_entries_id_fk" FOREIGN KEY ("workout_exercise_entry_id") REFERENCES "public"."workout_exercise_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "workout_exercise_entries_session_sort_unique_idx" ON "workout_exercise_entries" USING btree ("workout_session_id","sort_order");--> statement-breakpoint
CREATE INDEX "workout_exercise_entries_session_idx" ON "workout_exercise_entries" USING btree ("workout_session_id");--> statement-breakpoint
CREATE INDEX "workout_sessions_user_performed_started_idx" ON "workout_sessions" USING btree ("user_id","performed_on" DESC NULLS LAST,"started_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "workout_sessions_user_open_unique_idx" ON "workout_sessions" USING btree ("user_id") WHERE "workout_sessions"."completed_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "workout_sets_entry_set_number_unique_idx" ON "workout_sets" USING btree ("workout_exercise_entry_id","set_number");--> statement-breakpoint
CREATE INDEX "workout_sets_entry_idx" ON "workout_sets" USING btree ("workout_exercise_entry_id");