CREATE TABLE "login_rate_limits" (
	"id" uuid PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"first_attempt_at" timestamp with time zone NOT NULL,
	"blocked_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "login_rate_limits_identifier_unique_idx" ON "login_rate_limits" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "login_rate_limits_blocked_until_idx" ON "login_rate_limits" USING btree ("blocked_until");