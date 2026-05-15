import { sql } from "drizzle-orm";
import {
  check,
  date,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { exerciseUnitEnum, exercises } from "./exercises";
import { plans, planWorkouts } from "./plans";
import { users } from "./users";

export const workoutSessions = pgTable(
  "workout_sessions",
  {
    id: uuid("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    planId: uuid("plan_id").references(() => plans.id, {
      onDelete: "set null",
    }),
    planWorkoutId: uuid("plan_workout_id").references(() => planWorkouts.id, {
      onDelete: "set null",
    }),
    performedOn: date("performed_on", { mode: "string" }).notNull(),
    startedAt: timestamp("started_at", {
      withTimezone: true,
      mode: "date",
    })
      .notNull()
      .defaultNow(),
    completedAt: timestamp("completed_at", {
      withTimezone: true,
      mode: "date",
    }),
    activeEntrySortOrder: integer("active_entry_sort_order"),
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
    index("workout_sessions_user_performed_started_idx").on(
      table.userId,
      table.performedOn.desc(),
      table.startedAt.desc(),
    ),
    index("workout_sessions_plan_idx").on(table.planId, table.planWorkoutId),
    uniqueIndex("workout_sessions_user_open_unique_idx")
      .on(table.userId)
      .where(sql`${table.completedAt} is null`),
    uniqueIndex("workout_sessions_plan_workout_unique_idx")
      .on(table.planWorkoutId)
      .where(sql`${table.planWorkoutId} is not null`),
  ],
);

export const workoutExerciseEntries = pgTable(
  "workout_exercise_entries",
  {
    id: uuid("id").primaryKey(),
    workoutSessionId: uuid("workout_session_id")
      .notNull()
      .references(() => workoutSessions.id, { onDelete: "cascade" }),
    exerciseId: uuid("exercise_id").references(() => exercises.id, {
      onDelete: "set null",
    }),
    exerciseNameSnapshot: text("exercise_name_snapshot").notNull(),
    exerciseCategorySnapshot: text("exercise_category_snapshot").notNull(),
    unitSnapshot: exerciseUnitEnum("unit_snapshot").notNull(),
    sortOrder: integer("sort_order").notNull(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("workout_exercise_entries_session_sort_unique_idx").on(
      table.workoutSessionId,
      table.sortOrder,
    ),
    index("workout_exercise_entries_session_idx").on(table.workoutSessionId),
  ],
);

export const workoutSets = pgTable(
  "workout_sets",
  {
    id: uuid("id").primaryKey(),
    workoutExerciseEntryId: uuid("workout_exercise_entry_id")
      .notNull()
      .references(() => workoutExerciseEntries.id, { onDelete: "cascade" }),
    setNumber: integer("set_number").notNull(),
    reps: integer("reps").notNull(),
    weight: numeric("weight", { precision: 6, scale: 2, mode: "number" })
      .notNull()
      .default(0),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("workout_sets_entry_set_number_unique_idx").on(
      table.workoutExerciseEntryId,
      table.setNumber,
    ),
    index("workout_sets_entry_idx").on(table.workoutExerciseEntryId),
    check("workout_sets_reps_check", sql`${table.reps} > 0`),
  ],
);
