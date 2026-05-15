import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { EXERCISE_UNITS } from "@/lib/exercise-units";

import { lower } from "./helpers";
import { users } from "./users";

export const exerciseUnitEnum = pgEnum("exercise_unit", EXERCISE_UNITS);

export const exercises = pgTable(
  "exercises",
  {
    id: uuid("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    category: text("category").notNull(),
    defaultUnit: exerciseUnitEnum("default_unit").notNull(),
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
    index("exercises_user_idx").on(table.userId),
    uniqueIndex("exercises_user_name_lower_unique_idx").on(
      table.userId,
      lower(table.name),
    ),
  ],
);
