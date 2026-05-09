CREATE TYPE "public"."exercise_unit" AS ENUM('kg', 'bodyweight');--> statement-breakpoint
CREATE TABLE "exercises" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"default_unit" "exercise_unit" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "exercises_user_idx" ON "exercises" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "exercises_user_name_lower_unique_idx" ON "exercises" USING btree ("user_id",lower("name"));