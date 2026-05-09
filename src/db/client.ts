import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set.");
}

const globalForDb = globalThis as typeof globalThis & {
  __fitnessAppPool?: Pool;
};

const pool =
  globalForDb.__fitnessAppPool ??
  new Pool({
    connectionString: databaseUrl,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__fitnessAppPool = pool;
}

export { pool };

export const db = drizzle({
  client: pool,
  schema,
});
