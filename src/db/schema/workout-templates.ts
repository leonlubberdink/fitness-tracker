import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { lower } from "./helpers";
import { exercises } from "./exercises";
import { users } from "./users";

export const workoutTemplates = pgTable(
  "workout_templates",
  {
    id: uuid("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
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
    index("workout_templates_user_idx").on(table.userId),
    uniqueIndex("workout_templates_user_name_lower_unique_idx").on(
      table.userId,
      lower(table.name),
    ),
  ],
);

export const workoutTemplateExercises = pgTable(
  "workout_template_exercises",
  {
    id: uuid("id").primaryKey(),
    workoutTemplateId: uuid("workout_template_id")
      .notNull()
      .references(() => workoutTemplates.id, { onDelete: "cascade" }),
    exerciseId: uuid("exercise_id")
      .notNull()
      .references(() => exercises.id, { onDelete: "restrict" }),
    sortOrder: integer("sort_order").notNull(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("workout_template_exercises_template_idx").on(
      table.workoutTemplateId,
    ),
    uniqueIndex("workout_template_exercises_template_sort_unique_idx").on(
      table.workoutTemplateId,
      table.sortOrder,
    ),
    uniqueIndex("workout_template_exercises_template_exercise_unique_idx").on(
      table.workoutTemplateId,
      table.exerciseId,
    ),
  ],
);
