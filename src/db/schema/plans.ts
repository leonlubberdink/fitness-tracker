import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { users } from "./users";
import { workoutTemplates } from "./workout-templates";

export const planStatusEnum = pgEnum("plan_status", [
  "draft",
  "active",
  "completed",
  "archived",
]);

export const planWorkoutStateEnum = pgEnum("plan_workout_state", [
  "planned",
  "skipped",
  "completed",
]);

export const plans = pgTable(
  "plans",
  {
    id: uuid("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    goal: text("goal").notNull(),
    durationWeeks: integer("duration_weeks").notNull(),
    status: planStatusEnum("status").notNull().default("draft"),
    startDate: text("start_date"),
    startedAt: timestamp("started_at", {
      withTimezone: true,
      mode: "date",
    }),
    completedAt: timestamp("completed_at", {
      withTimezone: true,
      mode: "date",
    }),
    archivedAt: timestamp("archived_at", {
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
    index("plans_user_status_idx").on(table.userId, table.status),
    uniqueIndex("plans_user_active_unique_idx")
      .on(table.userId)
      .where(sql`${table.status} = 'active'`),
    check("plans_duration_weeks_check", sql`${table.durationWeeks} > 0`),
  ],
);

export const planWorkouts = pgTable(
  "plan_workouts",
  {
    id: uuid("id").primaryKey(),
    planId: uuid("plan_id")
      .notNull()
      .references(() => plans.id, { onDelete: "cascade" }),
    workoutTemplateId: uuid("workout_template_id")
      .notNull()
      .references(() => workoutTemplates.id, { onDelete: "restrict" }),
    state: planWorkoutStateEnum("state").notNull().default("planned"),
    weekNumber: integer("week_number").notNull(),
    weekday: integer("weekday").notNull(),
    linkedWorkoutSessionId: uuid("linked_workout_session_id"),
    skippedAt: timestamp("skipped_at", {
      withTimezone: true,
      mode: "date",
    }),
    completedAt: timestamp("completed_at", {
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
    index("plan_workouts_plan_idx").on(table.planId, table.weekNumber, table.weekday),
    uniqueIndex("plan_workouts_plan_weekday_unique_idx").on(
      table.planId,
      table.weekNumber,
      table.weekday,
    ),
    uniqueIndex("plan_workouts_linked_session_unique_idx")
      .on(table.linkedWorkoutSessionId)
      .where(sql`${table.linkedWorkoutSessionId} is not null`),
    check("plan_workouts_week_number_check", sql`${table.weekNumber} > 0`),
    check(
      "plan_workouts_weekday_check",
      sql`${table.weekday} >= 1 and ${table.weekday} <= 7`,
    ),
  ],
);
