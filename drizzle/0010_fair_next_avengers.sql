CREATE TYPE "public"."health_activity_level" AS ENUM('sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extremely_active');--> statement-breakpoint
CREATE TYPE "public"."health_goal_mode" AS ENUM('lose', 'maintain', 'gain');--> statement-breakpoint
CREATE TYPE "public"."health_sex" AS ENUM('male', 'female', 'intersex', 'prefer_not_to_say');--> statement-breakpoint
CREATE TABLE "daily_health_checkins" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"recorded_on" date NOT NULL,
	"weight_kg" numeric(6, 2) NOT NULL,
	"readiness_rating" integer NOT NULL,
	"soreness_pain_rating" integer NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "daily_health_checkins_weight_kg_check" CHECK ("daily_health_checkins"."weight_kg" > 0),
	CONSTRAINT "daily_health_checkins_readiness_rating_check" CHECK ("daily_health_checkins"."readiness_rating" >= 1 and "daily_health_checkins"."readiness_rating" <= 5),
	CONSTRAINT "daily_health_checkins_soreness_pain_rating_check" CHECK ("daily_health_checkins"."soreness_pain_rating" >= 1 and "daily_health_checkins"."soreness_pain_rating" <= 5)
);
--> statement-breakpoint
CREATE TABLE "user_health_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"sex" "health_sex",
	"birth_date" date,
	"height_cm" integer,
	"activity_level" "health_activity_level",
	"diet_preference" text,
	"allergies" text,
	"injuries_limitations" text,
	"goal_mode" "health_goal_mode",
	"target_weight_kg" numeric(6, 2),
	"pace_kg_per_month" numeric(6, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_health_profiles_height_cm_check" CHECK ("user_health_profiles"."height_cm" is null or "user_health_profiles"."height_cm" > 0),
	CONSTRAINT "user_health_profiles_target_weight_kg_check" CHECK ("user_health_profiles"."target_weight_kg" is null or "user_health_profiles"."target_weight_kg" > 0),
	CONSTRAINT "user_health_profiles_pace_kg_per_month_check" CHECK ("user_health_profiles"."pace_kg_per_month" is null or "user_health_profiles"."pace_kg_per_month" > 0)
);
--> statement-breakpoint
ALTER TABLE "exercises" ADD COLUMN "note" text;--> statement-breakpoint
ALTER TABLE "workout_sessions" ADD COLUMN "note" text;--> statement-breakpoint
ALTER TABLE "daily_health_checkins" ADD CONSTRAINT "daily_health_checkins_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_health_profiles" ADD CONSTRAINT "user_health_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "daily_health_checkins_user_recorded_on_idx" ON "daily_health_checkins" USING btree ("user_id","recorded_on" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "daily_health_checkins_user_recorded_on_unique_idx" ON "daily_health_checkins" USING btree ("user_id","recorded_on");