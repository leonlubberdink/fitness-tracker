import { sql } from "drizzle-orm";
import {
  check,
  date,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { users } from "./users";

export const healthSexEnum = pgEnum("health_sex", [
  "male",
  "female",
  "intersex",
  "prefer_not_to_say",
]);

export const healthActivityLevelEnum = pgEnum("health_activity_level", [
  "sedentary",
  "lightly_active",
  "moderately_active",
  "very_active",
  "extremely_active",
]);

export const healthGoalModeEnum = pgEnum("health_goal_mode", [
  "lose",
  "maintain",
  "gain",
]);

export const userHealthProfiles = pgTable(
  "user_health_profiles",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    sex: healthSexEnum("sex"),
    birthDate: date("birth_date", { mode: "string" }),
    heightCm: integer("height_cm"),
    activityLevel: healthActivityLevelEnum("activity_level"),
    dietPreference: text("diet_preference"),
    allergies: text("allergies"),
    injuriesLimitations: text("injuries_limitations"),
    goalMode: healthGoalModeEnum("goal_mode"),
    targetWeightKg: numeric("target_weight_kg", {
      precision: 6,
      scale: 2,
      mode: "number",
    }),
    paceKgPerMonth: numeric("pace_kg_per_month", {
      precision: 6,
      scale: 2,
      mode: "number",
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
    check(
      "user_health_profiles_height_cm_check",
      sql`${table.heightCm} is null or ${table.heightCm} > 0`,
    ),
    check(
      "user_health_profiles_target_weight_kg_check",
      sql`${table.targetWeightKg} is null or ${table.targetWeightKg} > 0`,
    ),
    check(
      "user_health_profiles_pace_kg_per_month_check",
      sql`${table.paceKgPerMonth} is null or ${table.paceKgPerMonth} > 0`,
    ),
  ],
);

export const dailyHealthCheckins = pgTable(
  "daily_health_checkins",
  {
    id: uuid("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    recordedOn: date("recorded_on", { mode: "string" }).notNull(),
    weightKg: numeric("weight_kg", {
      precision: 6,
      scale: 2,
      mode: "number",
    }).notNull(),
    readinessRating: integer("readiness_rating").notNull(),
    sorenessPainRating: integer("soreness_pain_rating").notNull(),
    note: text("note"),
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
    index("daily_health_checkins_user_recorded_on_idx").on(
      table.userId,
      table.recordedOn.desc(),
    ),
    uniqueIndex("daily_health_checkins_user_recorded_on_unique_idx").on(
      table.userId,
      table.recordedOn,
    ),
    check(
      "daily_health_checkins_weight_kg_check",
      sql`${table.weightKg} > 0`,
    ),
    check(
      "daily_health_checkins_readiness_rating_check",
      sql`${table.readinessRating} >= 1 and ${table.readinessRating} <= 5`,
    ),
    check(
      "daily_health_checkins_soreness_pain_rating_check",
      sql`${table.sorenessPainRating} >= 1 and ${table.sorenessPainRating} <= 5`,
    ),
  ],
);
