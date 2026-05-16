CREATE TYPE "public"."health_coach_message_role" AS ENUM('user', 'assistant');--> statement-breakpoint
CREATE TYPE "public"."health_coach_proposal_kind" AS ENUM('exercise_create', 'exercise_update', 'workout_template_create', 'workout_template_update', 'plan_create', 'plan_update', 'plan_workout_upsert');--> statement-breakpoint
CREATE TYPE "public"."health_coach_proposal_status" AS ENUM('pending', 'approved', 'rejected', 'applied', 'failed');--> statement-breakpoint
CREATE TYPE "public"."health_coach_tool_type" AS ENUM('function', 'web_search');--> statement-breakpoint
CREATE TABLE "health_coach_change_proposals" (
	"id" uuid PRIMARY KEY NOT NULL,
	"conversation_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" "health_coach_proposal_kind" NOT NULL,
	"status" "health_coach_proposal_status" DEFAULT 'pending' NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"payload" jsonb NOT NULL,
	"diff" jsonb NOT NULL,
	"apply_result" jsonb,
	"error_message" text,
	"approved_at" timestamp with time zone,
	"rejected_at" timestamp with time zone,
	"applied_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "health_coach_conversations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"openai_conversation_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "health_coach_messages" (
	"id" uuid PRIMARY KEY NOT NULL,
	"conversation_id" uuid NOT NULL,
	"role" "health_coach_message_role" NOT NULL,
	"content" text NOT NULL,
	"citations" jsonb,
	"openai_response_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "health_coach_tool_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"conversation_id" uuid NOT NULL,
	"proposal_id" uuid,
	"type" "health_coach_tool_type" NOT NULL,
	"tool_name" text NOT NULL,
	"tool_call_id" text,
	"status" text NOT NULL,
	"request_payload" jsonb,
	"response_payload" jsonb,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "health_coach_change_proposals" ADD CONSTRAINT "health_coach_change_proposals_conversation_id_health_coach_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."health_coach_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health_coach_change_proposals" ADD CONSTRAINT "health_coach_change_proposals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health_coach_conversations" ADD CONSTRAINT "health_coach_conversations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health_coach_messages" ADD CONSTRAINT "health_coach_messages_conversation_id_health_coach_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."health_coach_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health_coach_tool_events" ADD CONSTRAINT "health_coach_tool_events_conversation_id_health_coach_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."health_coach_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health_coach_tool_events" ADD CONSTRAINT "health_coach_tool_events_proposal_id_health_coach_change_proposals_id_fk" FOREIGN KEY ("proposal_id") REFERENCES "public"."health_coach_change_proposals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "health_coach_change_proposals_conversation_idx" ON "health_coach_change_proposals" USING btree ("conversation_id","created_at");--> statement-breakpoint
CREATE INDEX "health_coach_change_proposals_user_status_idx" ON "health_coach_change_proposals" USING btree ("user_id","status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "health_coach_conversations_user_unique_idx" ON "health_coach_conversations" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "health_coach_conversations_openai_unique_idx" ON "health_coach_conversations" USING btree ("openai_conversation_id");--> statement-breakpoint
CREATE INDEX "health_coach_messages_conversation_created_idx" ON "health_coach_messages" USING btree ("conversation_id","created_at");--> statement-breakpoint
CREATE INDEX "health_coach_tool_events_conversation_created_idx" ON "health_coach_tool_events" USING btree ("conversation_id","created_at");--> statement-breakpoint
CREATE INDEX "health_coach_tool_events_proposal_idx" ON "health_coach_tool_events" USING btree ("proposal_id");