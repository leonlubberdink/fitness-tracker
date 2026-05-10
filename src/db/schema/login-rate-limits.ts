import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const loginRateLimits = pgTable(
  "login_rate_limits",
  {
    id: uuid("id").primaryKey(),
    identifier: text("identifier").notNull(),
    attemptCount: integer("attempt_count").notNull().default(0),
    firstAttemptAt: timestamp("first_attempt_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
    blockedUntil: timestamp("blocked_until", {
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
    uniqueIndex("login_rate_limits_identifier_unique_idx").on(table.identifier),
    index("login_rate_limits_blocked_until_idx").on(table.blockedUntil),
  ],
);
