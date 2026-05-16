import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { users } from "./users";

export const healthCoachMessageRoleEnum = pgEnum("health_coach_message_role", [
  "user",
  "assistant",
]);

export const healthCoachToolTypeEnum = pgEnum("health_coach_tool_type", [
  "function",
  "web_search",
]);

export const healthCoachProposalKindEnum = pgEnum("health_coach_proposal_kind", [
  "exercise_create",
  "exercise_update",
  "workout_template_create",
  "workout_template_update",
  "plan_create",
  "plan_update",
  "plan_workout_upsert",
]);

export const healthCoachProposalStatusEnum = pgEnum(
  "health_coach_proposal_status",
  ["pending", "approved", "rejected", "applied", "failed"],
);

export const healthCoachConversations = pgTable(
  "health_coach_conversations",
  {
    id: uuid("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    openaiConversationId: text("openai_conversation_id").notNull(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "date",
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("health_coach_conversations_user_unique_idx").on(table.userId),
    uniqueIndex("health_coach_conversations_openai_unique_idx").on(
      table.openaiConversationId,
    ),
  ],
);

export const healthCoachMessages = pgTable(
  "health_coach_messages",
  {
    id: uuid("id").primaryKey(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => healthCoachConversations.id, { onDelete: "cascade" }),
    role: healthCoachMessageRoleEnum("role").notNull(),
    content: text("content").notNull(),
    citations: jsonb("citations").$type<
      Array<{
        endIndex: number;
        startIndex: number;
        title: string | null;
        url: string;
      }>
    >(),
    openaiResponseId: text("openai_response_id"),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("health_coach_messages_conversation_created_idx").on(
      table.conversationId,
      table.createdAt,
    ),
  ],
);

export const healthCoachChangeProposals = pgTable(
  "health_coach_change_proposals",
  {
    id: uuid("id").primaryKey(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => healthCoachConversations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: healthCoachProposalKindEnum("kind").notNull(),
    status: healthCoachProposalStatusEnum("status").notNull().default("pending"),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    diff: jsonb("diff")
      .$type<{
        changes: Array<{
          after: string | null;
          before: string | null;
          label: string;
        }>;
        details?: string[];
      }>()
      .notNull(),
    applyResult: jsonb("apply_result").$type<Record<string, unknown>>(),
    errorMessage: text("error_message"),
    approvedAt: timestamp("approved_at", {
      withTimezone: true,
      mode: "date",
    }),
    rejectedAt: timestamp("rejected_at", {
      withTimezone: true,
      mode: "date",
    }),
    appliedAt: timestamp("applied_at", {
      withTimezone: true,
      mode: "date",
    }),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "date",
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("health_coach_change_proposals_conversation_idx").on(
      table.conversationId,
      table.createdAt,
    ),
    index("health_coach_change_proposals_user_status_idx").on(
      table.userId,
      table.status,
      table.createdAt,
    ),
  ],
);

export const healthCoachToolEvents = pgTable(
  "health_coach_tool_events",
  {
    id: uuid("id").primaryKey(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => healthCoachConversations.id, { onDelete: "cascade" }),
    proposalId: uuid("proposal_id").references(() => healthCoachChangeProposals.id, {
      onDelete: "set null",
    }),
    type: healthCoachToolTypeEnum("type").notNull(),
    toolName: text("tool_name").notNull(),
    toolCallId: text("tool_call_id"),
    status: text("status").notNull(),
    requestPayload: jsonb("request_payload").$type<Record<string, unknown>>(),
    responsePayload: jsonb("response_payload").$type<Record<string, unknown>>(),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("health_coach_tool_events_conversation_created_idx").on(
      table.conversationId,
      table.createdAt,
    ),
    index("health_coach_tool_events_proposal_idx").on(table.proposalId),
  ],
);
